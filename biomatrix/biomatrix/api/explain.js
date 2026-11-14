/**
 * Vercel serverless function: POST /api/explain
 *
 * Receives today's readings from the BioMatrix app and asks Google Gemini for a
 * short, plain-language explanation. The API key stays on the server: set it in
 * Vercel -> Project -> Settings -> Environment Variables as GEMINI_API_KEY.
 * Optional: GEMINI_MODEL (default "gemini-flash-latest"). If that model is busy (503),
 * rate-limited (429) or unavailable, the function retries once and then tries lighter models.
 */

const SYSTEM_PROMPT = `You are the health assistant inside BioMatrix, an astronaut self-assessment app.
Write 3 to 4 short sentences in plain English for the astronaut.
Rules:
- Use ONLY the readings and facts given to you. Do not add numbers, studies or facts of your own.
- Never diagnose a disease and never prescribe medication.
- If a "Linked pattern" fact is given, start with it: say in one sentence what connects the readings.
- Mention the most important out-of-range readings first and what to do next, using the recommended actions given.
- Call trends estimates, never certain predictions.
- If any reading has status "red", say clearly that they should contact the flight surgeon.
- If the communication delay is long (Mars), say that self-care steps come first while waiting for Earth.
- If everything is green, say so briefly and encourage keeping the routine.
- No lists, no headings, no emoji.`;

const MAX_BODY_CHARS = 12000;
/** Give up on Gemini after this long, so the app never waits forever. */
const GEMINI_TIMEOUT_MS = 25000;
/** Tried in order after GEMINI_MODEL when a model is busy or unavailable. */
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash'];
/** Errors worth one quick retry: rate limit, server error, overloaded. */
const RETRYABLE = new Set([429, 500, 503]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'missing_key' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || !Array.isArray(body.readings) || JSON.stringify(body).length > MAX_BODY_CHARS) {
    return res.status(400).json({ error: 'bad_request' });
  }

  const readings = body.readings
    .slice(0, 30)
    .map((r) => `- ${String(r.name)}: ${String(r.value)} (status: ${String(r.status)}${r.note ? `, ${String(r.note)}` : ''})`)
    .join('\n');
  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 40).map((f) => `- ${String(f)}`).join('\n') : '';

  const userPrompt = `Mission environment: ${String(body.environment)}
Communication delay to Earth: ${String(body.commDelay)}
Mission day: ${Number(body.missionDay) || 'unknown'}
Triage result: level ${Number(body.triage?.level)} - ${String(body.triage?.title)}. ${String(body.triage?.reason ?? '')}

Today's readings:
${readings}

Facts and recommended actions you may use:
${facts || '- (all readings are in range)'}

Explain these results to the astronaut.`;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  });

  // Free Gemini models are sometimes overloaded (503) or rate-limited (429).
  // Try each model up to twice, then move on to the next, lighter model.
  const models = [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', ...FALLBACK_MODELS])];
  const deadline = Date.now() + GEMINI_TIMEOUT_MS;
  let lastError = 'ai_unavailable';

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const timeLeft = deadline - Date.now();
      if (timeLeft < 1500) {
        return res.status(504).json({ error: 'timeout' });
      }
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            signal: AbortSignal.timeout(timeLeft),
            body: requestBody,
          },
        );
        const data = await response.json().catch(() => null);

        if (response.ok) {
          const text = (data?.candidates?.[0]?.content?.parts ?? [])
            .map((p) => p.text ?? '')
            .join('')
            .trim();
          if (text) return res.status(200).json({ text, model });
          console.error('Gemini returned no text', model, JSON.stringify(data)?.slice(0, 300));
          lastError = 'empty_answer';
          break; // try the next model
        }

        console.error('Gemini error', model, response.status, JSON.stringify(data)?.slice(0, 300));
        if (response.status === 401 || response.status === 403) {
          return res.status(502).json({ error: 'bad_key' });
        }
        if (RETRYABLE.has(response.status) && attempt === 1) {
          await sleep(1200);
          continue; // same model, one more time
        }
        lastError = response.status === 429 ? 'busy' : response.status === 503 ? 'busy' : 'ai_unavailable';
        break; // next model (also used for 404: model name not available)
      } catch (err) {
        const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
        console.error(timedOut ? 'Gemini request timed out' : 'Gemini request failed', model, err?.message);
        if (timedOut) return res.status(504).json({ error: 'timeout' });
        lastError = 'ai_unavailable';
        break;
      }
    }
  }

  return res.status(503).json({ error: lastError });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
