import { ChevronDown, CircleCheck, Siren, Stethoscope, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { METRICS, type Environment, type TriageLevel, type TriageResult } from '../data/spaceHealthEngine';
import { FactLine, StatusBadge } from './ui';

const LEVEL_STYLE: Record<TriageLevel, { box: string; accent: string; icon: ReactNode }> = {
  0: {
    box: 'border-emerald-400/40 bg-emerald-400/10',
    accent: 'text-emerald-300',
    icon: <CircleCheck className="h-6 w-6" aria-hidden="true" />,
  },
  1: {
    box: 'border-amber-400/50 bg-amber-400/10',
    accent: 'text-amber-300',
    icon: <Stethoscope className="h-6 w-6" aria-hidden="true" />,
  },
  2: {
    box: 'border-orange-400/60 bg-orange-400/10',
    accent: 'text-orange-300',
    icon: <Users className="h-6 w-6" aria-hidden="true" />,
  },
  3: {
    box: 'border-rose-400/70 bg-rose-500/15',
    accent: 'text-rose-300',
    icon: <Siren className="h-6 w-6" aria-hidden="true" />,
  },
};

export function TriageBanner({ triage, env }: { triage: TriageResult; env: Environment }) {
  const [open, setOpen] = useState(true);
  const style = LEVEL_STYLE[triage.level];

  return (
    <section aria-live="polite" className={`rounded-xl border-2 shadow-lg shadow-black/30 backdrop-blur-md ${style.box}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`mt-0.5 shrink-0 ${style.accent}`}>{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${style.accent}`}>
            Autonomous triage | Level {triage.level} of 3
          </p>
          <h2 className="text-lg font-bold leading-snug text-slate-50">{triage.title}</h2>
          <p className="mt-0.5 text-xs text-slate-300">{triage.subtitle}</p>
          <p className="mt-1.5 text-sm text-slate-100">{triage.reason}</p>
        </div>
      </div>

      {triage.level > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          {triage.selfCareFirst && triage.level === 3 && (
            <p className="mb-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
              {env.commDelay.text}: self-care steps come first because Earth cannot answer quickly.
            </p>
          )}
          <ol className="space-y-1.5 text-sm text-slate-100">
            {triage.steps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${style.box} ${style.accent}`}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="mt-3 flex min-h-9 items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            Telemetry summary ({triage.findings.length} out of range) and countermeasures
          </button>

          {open && (
            <div className="mt-2 space-y-3">
              <ul className="divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950/50 text-xs">
                {triage.findings.map((f) => (
                  <li key={f.metric} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
                    <span className="font-semibold text-slate-100">{METRICS[f.metric].label}</span>
                    <span className="font-mono text-slate-200">
                      {f.value}
                      {METRICS[f.metric].unit ? ` ${METRICS[f.metric].unit}` : ''}
                    </span>
                    <span className="text-slate-400">{f.note}</span>
                    {f.persisting && <span className="text-orange-300">also at last check-in</span>}
                    <StatusBadge status={f.status} className="ml-auto" />
                  </li>
                ))}
              </ul>
              <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-200">
                {triage.actions.map((fact) => (
                  <li key={fact.text}>
                    <FactLine fact={fact} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
