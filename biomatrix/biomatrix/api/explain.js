/**
 * Vercel serverless function: POST /api/explain
 *
 * Receives today's readings from the BioMatrix app and asks Google Gemini for a
 * short, plain-language explanation. The API key stays on the server: set it in
 * Vercel -> Project -> Settings -> Environment Variables as GEMINI_API_KEY.
 * Optional: GEMINI_MODEL (default "gemini-flash-latest").
 */

const SYSTEM_PROMPT = `You are the health assistant inside BioMatrix, an astronaut self-assessment app.
Write 3 to 4 short sentences in plain English for the astronaut.
Rules:
- Use ONLY the readings and facts given to you. Do not add numbers, studies or facts of your own.
- Never diagnose a disease and never prescribe medication.
- Mention the most important out-of-range readings first and what to do next, using the recommended actions given.
- If any reading has status "red", say clearly that they should contact the flight surgeon.
- If the communication delay is long (Mars), say that self-care steps come first while waiting for Earth.
- If everything is green, say so briefly and encourage keeping the routine.
- No lists, no headings, no emoji.`;

const MAX_BODY_CHARS = 12000;

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

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Gemini error', response.status, JSON.stringify(data)?.slice(0, 500));
      return res.status(502).json({ error: 'ai_unavailable' });
    }

    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) return res.status(502).json({ error: 'empty_answer' });

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Gemini request failed', err);
    return res.status(502).json({ error: 'ai_unavailable' });
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
