import {
  BrainCircuit,
  Check,
  FileText,
  Link2,
  ListChecks,
  RotateCcw,
  Satellite,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  SkipForward,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  FORECAST_SOURCE,
  READINESS_SOURCE,
  type CopilotAction,
  type CopilotResult,
  type ReadinessVerdict,
} from '../data/autonomyCopilot';
import { SourceTag, StatusBadge } from './ui';

/** One thing the astronaut did (or skipped) in the copilot protocol. Saved in the browser. */
export interface CopilotLogEntry {
  /** Local date, YYYY-MM-DD. */
  date: string;
  actionId: string;
  text: string;
  /** ISO time. */
  at: string;
  outcome: 'started' | 'done' | 'skipped';
}

interface AutonomyCopilotProps {
  result: CopilotResult;
  /** Today's log entries, oldest first. */
  log: CopilotLogEntry[];
  onLog: (action: CopilotAction, outcome: CopilotLogEntry['outcome']) => void;
  onRestart: () => void;
  onOpenReport: () => void;
}

const VERDICT: Record<ReadinessVerdict, { word: string; box: string; text: string; icon: ReactNode }> = {
  go: {
    word: 'GO',
    box: 'border-emerald-400/50 bg-emerald-400/10',
    text: 'text-emerald-300',
    icon: <ShieldCheck className="h-7 w-7" aria-hidden="true" />,
  },
  caution: {
    word: 'CAUTION',
    box: 'border-amber-400/60 bg-amber-400/10',
    text: 'text-amber-300',
    icon: <ShieldAlert className="h-7 w-7" aria-hidden="true" />,
  },
  'no-go': {
    word: 'NO-GO',
    box: 'border-rose-400/70 bg-rose-500/15',
    text: 'text-rose-300',
    icon: <ShieldX className="h-7 w-7" aria-hidden="true" />,
  },
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function SectionTitle({ icon, children, right }: { icon: ReactNode; children: string; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-cyan-300">{icon}</span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{children}</h3>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/**
 * Autonomy Copilot: correlates body, habitat and space-weather signals, forecasts trends from
 * the astronaut's own check-ins, decides EVA readiness, and walks through one action at a time.
 * Everything runs in the browser, so it keeps working when Earth is 20 minutes away.
 */
export function AutonomyCopilot({ result, log, onLog, onRestart, onOpenReport }: AutonomyCopilotProps) {
  const { patterns, conflict, readiness, forecasts, drifts, historyCount, protocol, earth } = result;
  const verdict = VERDICT[readiness.verdict];

  // The last log entry of each step decides its state.
  const last = new Map<string, CopilotLogEntry>();
  for (const e of log) last.set(e.actionId, e);
  const isComplete = (id: string) => {
    const e = last.get(id);
    return e?.outcome === 'done' || e?.outcome === 'skipped';
  };
  const currentIndex = protocol.findIndex((x) => !isComplete(x.id));
  const completed = protocol.filter((x) => isComplete(x.id)).length;

  // A running timer for the current step.
  const current = currentIndex >= 0 ? protocol[currentIndex] : null;
  const started = current ? last.get(current.id) : undefined;
  const timerEnd =
    current?.waitMinutes && started?.outcome === 'started' ? new Date(started.at).getTime() + current.waitMinutes * 60_000 : null;
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!timerEnd) return;
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerEnd]);
  const remaining = timerEnd ? Math.max(0, timerEnd - tick) : 0;
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <section
      id="autonomy-copilot"
      className="panel-glow panel-glow-cyan reveal rounded-xl border border-cyan-400/30 bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur-md"
      aria-label="Autonomy Copilot"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2.5">
        <BrainCircuit className="copilot-core h-5 w-5 text-cyan-300" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Autonomy Copilot</h2>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
          Works without Earth
        </span>
      </header>

      <div className="space-y-4 p-4">
        {/* Readiness */}
        <div className={`rounded-lg border-2 px-3 py-3 ${verdict.box}`} aria-live="polite">
          <div className="flex items-center gap-3">
            <span className={verdict.text}>{verdict.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Readiness: {readiness.task}</p>
              <p className={`text-2xl font-black tracking-wider ${verdict.text}`}>{verdict.word}</p>
            </div>
            <SourceTag source={READINESS_SOURCE.source} />
          </div>
          {readiness.blockers.length + readiness.cautions.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {readiness.blockers.map((b) => (
                <li key={b.text} className="flex flex-wrap gap-x-2">
                  <span className="font-semibold text-rose-200">✕ {b.text}</span>
                  <span className="text-slate-400">clears when: {b.clears}</span>
                </li>
              ))}
              {readiness.cautions.map((c) => (
                <li key={c.text} className="flex flex-wrap gap-x-2">
                  <span className="font-semibold text-amber-200">! {c.text}</span>
                  <span className="text-slate-400">clears when: {c.clears}</span>
                </li>
              ))}
            </ul>
          )}
          {readiness.verdict === 'caution' && (
            <p className="mt-2 text-xs text-amber-100">Go only with a buddy check and a crewmate watching.</p>
          )}
        </div>

        {/* What's happening */}
        <div>
          <SectionTitle icon={<Link2 className="h-4 w-4" aria-hidden="true" />}>What&apos;s happening</SectionTitle>
          {patterns.length === 0 ? (
            <p className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
              No linked patterns: your body, the cabin air and space weather do not point to a shared cause.
            </p>
          ) : (
            <ul className="space-y-2">
              {patterns.map((p) => (
                <li key={p.id} className="copilot-card rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-slate-50">{p.title}</p>
                    <StatusBadge status={p.severity} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.drill && (
                      <span className="drill-badge inline-flex items-center rounded border border-amber-300/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
                        Training drill
                      </span>
                    )}
                    {p.crewWide && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/50 bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        Whole crew
                      </span>
                    )}
                    {p.evidence.map((e) => (
                      <span key={e} className="rounded-full border border-slate-600 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200">
                        {e}
                      </span>
                    ))}
                    {p.ruledOut.map((r) => (
                      <span key={r} className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[11px] text-emerald-200">
                        ✓ {r}: ruled out
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {p.explanation.text} <SourceTag source={p.explanation.source} />
                  </p>
                </li>
              ))}
            </ul>
          )}
          {conflict && (
            <p className="mt-2 flex items-start gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
              <Scale className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {conflict.text} <SourceTag source={conflict.source} />
              </span>
            </p>
          )}
        </div>

        {/* What happens next */}
        <div>
          <SectionTitle icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />} right={<SourceTag source={FORECAST_SOURCE.source} />}>
            What happens next
          </SectionTitle>
          {historyCount < 2 ? (
            <p className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
              Save check-ins on at least 3 different days and the copilot will learn your personal normal and forecast your trends
              ({historyCount} earlier check-in{historyCount === 1 ? '' : 's'} so far).
            </p>
          ) : forecasts.length === 0 && drifts.length === 0 ? (
            <p className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
              No worrying trend in your last check-ins, and today matches your personal normal.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {forecasts.map((f) => (
                <li key={f.metric} className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                  <span className="mt-0.5 shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-200">
                    ~{f.days}d
                  </span>
                  <span className="min-w-0 flex-1 text-slate-200">{f.text}</span>
                  <StatusBadge status={f.toStatus} />
                </li>
              ))}
              {drifts.map((d) => (
                <li key={d.key} className="flex items-start gap-2 rounded-md border border-sky-400/30 bg-sky-400/5 px-3 py-2">
                  <span className="mt-0.5 shrink-0 rounded bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-200">
                    Drift
                  </span>
                  <span className="min-w-0 flex-1 text-slate-200">{d.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Do now */}
        <div>
          <SectionTitle
            icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
            right={
              protocol.length > 0 && log.length > 0 ? (
                <button type="button" onClick={onRestart} className="flex min-h-8 items-center gap-1 rounded px-2 text-[11px] text-slate-400 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Restart
                </button>
              ) : undefined
            }
          >
            Do now
          </SectionTitle>

          <p className="mb-2 flex items-start gap-2 text-xs text-slate-300">
            <Satellite className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            {earth.text}
          </p>

          {protocol.length === 0 ? (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-100">
              Nothing to do right now. Keep the routine and save tomorrow&apos;s check-in.
            </p>
          ) : (
            <>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500" style={{ width: `${(completed / protocol.length) * 100}%` }} />
              </div>
              <p className="mb-2 text-[11px] text-slate-500" aria-live="polite">
                {completed} of {protocol.length} steps done
              </p>
              <ol className="space-y-1.5">
                {protocol.map((step, i) => {
                  const done = isComplete(step.id);
                  const entry = last.get(step.id);
                  const active = i === currentIndex;
                  return (
                    <li
                      key={step.id}
                      className={`rounded-md border px-3 py-2 text-sm transition ${
                        active
                          ? 'copilot-active border-cyan-300/60 bg-cyan-400/10'
                          : done
                            ? 'border-slate-800 bg-slate-950/30 opacity-70'
                            : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                            done ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200' : active ? 'border-cyan-300 text-cyan-100' : 'border-slate-600 text-slate-400'
                          }`}
                        >
                          {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={`min-w-0 flex-1 ${done ? 'text-slate-400 line-through decoration-slate-600' : active ? 'font-semibold text-slate-50' : 'text-slate-300'}`}>
                          {step.id.startsWith('drill-') && (
                            <span className="mr-1 rounded border border-amber-300/60 px-1 text-[10px] font-bold uppercase text-amber-200">Drill</span>
                          )}
                          {step.text}{' '}
                          {step.crew && <Users className="inline h-3.5 w-3.5 text-violet-300" aria-label="involves the crew" />}
                        </span>
                        {done && entry && (
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {entry.outcome === 'skipped' ? 'skipped' : 'done'} {timeOf(entry.at)}
                          </span>
                        )}
                      </div>

                      {active && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                          {step.waitMinutes && timerEnd !== null && (
                            <span className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-sm ${remaining > 0 ? 'border-cyan-400/50 text-cyan-100' : 'timer-done border-emerald-400/60 text-emerald-200'}`} role="timer">
                              <Timer className="h-4 w-4" aria-hidden="true" />
                              {remaining > 0 ? mmss : 'Time is up: do the follow-up'}
                            </span>
                          )}
                          {step.waitMinutes && timerEnd === null && (
                            <button
                              type="button"
                              onClick={() => onLog(step, 'started')}
                              className="flex min-h-9 items-center gap-1.5 rounded-md border border-cyan-300/60 bg-cyan-400/15 px-3 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/25"
                            >
                              <Timer className="h-4 w-4" aria-hidden="true" />
                              Start {step.waitMinutes}-min timer
                            </button>
                          )}
                          {step.opensReport && (
                            <button
                              type="button"
                              onClick={onOpenReport}
                              className="flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300/60 bg-rose-500/20 px-3 text-xs font-semibold text-rose-50 hover:bg-rose-500/30"
                            >
                              <FileText className="h-4 w-4" aria-hidden="true" />
                              Open report
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onLog(step, 'done')}
                            className="btn-shine flex min-h-9 items-center gap-1.5 rounded-md border border-emerald-300/60 bg-emerald-400/20 px-3 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => onLog(step, 'skipped')}
                            className="flex min-h-9 items-center gap-1.5 rounded-md border border-slate-600 px-3 text-xs text-slate-300 hover:border-slate-400 hover:text-white"
                          >
                            <SkipForward className="h-4 w-4" aria-hidden="true" />
                            Skip
                          </button>
                          <SourceTag source={step.source} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {currentIndex === -1 && (
                <p className="mt-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                  All steps done. Your actions are logged in the flight surgeon report. Re-measure and save a new check-in.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
