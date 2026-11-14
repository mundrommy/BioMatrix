import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  METRICS,
  METRIC_ORDER,
  formatMetric,
  sourceLabel,
  type Assessment,
  type Environment,
  type Vitals,
} from '../data/spaceHealthEngine';
import type { CopilotResult } from '../data/autonomyCopilot';

interface AiExplainProps {
  assessment: Assessment;
  vitals: Vitals;
  env: Environment;
  missionDay: number;
  /** Linked patterns, readiness and forecasts from the Autonomy Copilot. */
  copilot?: CopilotResult;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; text: string; at: string }
  | { kind: 'error'; message: string };

/**
 * "Explain my results": sends today's values (no name or personal details) to our
 * serverless function, which asks Google Gemini for a short plain-language summary.
 * The AI is told to use only the facts we send and never to diagnose.
 */
export function AiExplain({ assessment, vitals, env, missionDay, copilot }: AiExplainProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const explain = async () => {
    setState({ kind: 'loading' });
    const outOfRange = assessment.triage.findings.map((f) => f.metric);
    const payload = {
      environment: env.name,
      commDelay: env.commDelay.text,
      missionDay,
      triage: { level: assessment.triage.level, title: assessment.triage.title, reason: assessment.triage.reason },
      readings: METRIC_ORDER.map((id) => ({
        name: METRICS[id].label,
        value: `${formatMetric(id, vitals)}${METRICS[id].unit ? ` ${METRICS[id].unit}` : ''}`,
        status: assessment.metrics[id].status,
        note: assessment.metrics[id].note,
      })),
      // Only these facts may be used by the AI.
      facts: [] as string[],
    };

    // Linked patterns first (most useful), then the per-indicator facts. The server reads at most 40
    // facts and rejects bodies over 12,000 characters, so trim to fit.
    payload.facts = [
      ...(copilot
        ? [
            ...copilot.patterns.map(
              (p) => `Linked pattern: ${p.title} Signals: ${p.evidence.join(', ')}. ${p.explanation.text} (source: ${sourceLabel(p.explanation.source)})`,
            ),
            `Readiness for ${copilot.readiness.task}: ${copilot.readiness.verdict.toUpperCase()}.`,
            ...copilot.forecasts.map((f) => `Trend (straight-line estimate, not a medical prediction): ${f.text}`),
            ...copilot.drifts.map((d) => `Personal baseline: ${d.text}`),
          ]
        : []),
      ...outOfRange.flatMap((id) => {
        const m = METRICS[id];
        const status = assessment.metrics[id].status;
        const actions = status === 'red' ? m.countermeasures.red : m.countermeasures.yellow;
        return [
          `${m.label} - why it matters in space: ${m.why.text} (source: ${sourceLabel(m.why.source)})`,
          ...actions.map((a) => `${m.label} - recommended action: ${a.text} (source: ${sourceLabel(a.source)})`),
        ];
      }),
    ].slice(0, 40);
    while (payload.facts.length > 0 && JSON.stringify(payload).length > 11500) payload.facts.pop();

    try {
      // Never wait more than 30 s for an answer.
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 30000);
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timer));
      const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
      const data = isJson ? ((await res.json().catch(() => null)) as { text?: string; error?: string } | null) : null;
      if (!res.ok || !data?.text) {
        const message =
          res.status === 404 || !isJson
            ? 'The AI explanation works on the online version of BioMatrix (hosted on Vercel). It is not available when the app runs only on this computer.'
            : data?.error === 'missing_key'
              ? 'The AI is not set up yet: the GEMINI_API_KEY setting is missing on the server.'
              : data?.error === 'timeout'
                ? 'The AI took too long to answer. Please try again.'
                : data?.error === 'busy'
                  ? 'Google\'s AI is very busy right now. Please try again in a minute.'
                  : data?.error === 'bad_key'
                    ? 'The AI key was rejected. Check GEMINI_API_KEY in the Vercel settings.'
              : 'The AI could not answer right now. Please try again in a minute.';
        setState({ kind: 'error', message });
        return;
      }
      setState({ kind: 'done', text: data.text, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) {
      const aborted = (err as { name?: string })?.name === 'AbortError';
      setState({
        kind: 'error',
        message: aborted
          ? 'The AI took too long to answer. Please try again.'
          : 'No connection to the AI service. Check the internet connection and try again.',
      });
    }
  };

  return (
    <section className="panel-glow panel-glow-violet reveal rounded-xl border border-violet-400/30 bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur-md" aria-label="AI explanation">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Sparkles className="sparkle-live h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">AI health assistant</p>
          <p className="text-sm text-slate-200">A short, plain-language explanation of today&apos;s results.</p>
        </div>
        <button
          type="button"
          onClick={explain}
          disabled={state.kind === 'loading'}
          className="btn-shine flex min-h-11 items-center gap-2 rounded-md border border-violet-300/50 bg-violet-400/20 px-4 text-sm font-semibold text-violet-50 shadow-md shadow-violet-950/50 transition hover:-translate-y-0.5 hover:bg-violet-400/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
        >
          {state.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {state.kind === 'loading' ? 'Thinking...' : 'Explain my results'}
        </button>
      </div>

      <div className="border-t border-slate-800 px-4 py-3 text-sm" aria-live="polite">
        {state.kind === 'done' && (
          <>
            <p className="ai-answer whitespace-pre-line leading-relaxed text-slate-100">{state.text}</p>
            <p className="mt-2 text-[11px] text-violet-200">
              AI-generated at {state.at}, based only on your values and the NASA facts in this app. Guidance only, not a medical
              diagnosis.
            </p>
          </>
        )}
        {state.kind === 'error' && <p className="text-amber-200">{state.message}</p>}
        <p className="mt-1 text-[11px] text-slate-500">
          When you press the button, today&apos;s values (no name or personal details) are sent to Google Gemini to write the
          explanation.
        </p>
      </div>
    </section>
  );
}
