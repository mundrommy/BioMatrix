import { ClipboardList, Orbit, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  HAZARDS,
  METRICS,
  ZONES,
  formatMetric,
  type Assessment,
  type Vitals,
  type ZoneId,
} from '../data/spaceHealthEngine';
import { ZONE_ICONS } from './AstronautMap';
import { FactLine, STATUS_STYLE, SourceTag, StatusBadge } from './ui';

interface DrawerProps {
  zoneId: ZoneId;
  assessment: Assessment;
  vitals: Vitals;
  onClose: () => void;
}

/** Slide-in panel with everything the astronaut needs to know about one body zone. */
export function GuidanceDrawer({ zoneId, assessment, vitals, onClose }: DrawerProps) {
  const zone = ZONES[zoneId];
  const status = assessment.zones[zoneId];
  const closeRef = useRef<HTMLButtonElement>(null);
  // Ticks for the "How to perform exam" checklists; reset when another zone opens.
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDone({});
    closeRef.current?.focus();
  }, [zoneId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close guidance" className="absolute inset-0 cursor-default bg-black/60" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Medical guidance: ${zone.name}`}
        className="drawer-in relative flex h-full w-full max-w-xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl shadow-black"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Medical guidance</p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-100">
              <span className={STATUS_STYLE[status].text}>{ZONE_ICONS[zoneId]}</span>
              {zone.name}
              <StatusBadge status={status} />
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{zone.organs}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close guidance"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm">
          {/* Linked NASA hazards */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Orbit className="h-3.5 w-3.5" aria-hidden="true" /> Linked NASA spaceflight hazards
            </h3>
            <ul className="space-y-2">
              {zone.hazards.map((h) => (
                <li key={h} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <p className="font-semibold text-sky-200">{HAZARDS[h].name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                    <FactLine fact={HAZARDS[h].summary} />
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Why space causes this */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Why space causes this</h3>
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-slate-200">
              {zone.whySpace.map((fact) => (
                <li key={fact.text}>
                  <FactLine fact={fact} />
                </li>
              ))}
            </ul>
          </section>

          {/* Current readings, exam steps and countermeasures per indicator */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Your readings and how to perform each exam
            </h3>
            <div className="space-y-3">
              {zone.metrics.map((id) => {
                const metric = METRICS[id];
                const evaluation = assessment.metrics[id];
                const style = STATUS_STYLE[evaluation.status];
                const actions =
                  evaluation.status === 'red'
                    ? metric.countermeasures.red
                    : evaluation.status === 'yellow'
                      ? metric.countermeasures.yellow
                      : [];
                return (
                  <article key={id} className={`rounded-lg border bg-slate-950/60 ${style.border}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                      <h4 className="font-semibold text-slate-100">{metric.label}</h4>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-100">
                          {formatMetric(id, vitals)}
                          {metric.unit ? ` ${metric.unit}` : ''}
                        </span>
                        <StatusBadge status={evaluation.status} />
                      </div>
                    </div>
                    <div className="space-y-3 px-3 py-3">
                      {evaluation.status !== 'green' && <p className={`text-xs font-semibold ${style.text}`}>{evaluation.note}</p>}

                      <p className="text-xs leading-relaxed text-slate-300">
                        <span className="font-semibold text-slate-100">Why this matters in space: </span>
                        <FactLine fact={metric.why} />
                      </p>

                      <div className="text-xs text-slate-300">
                        <p className="mb-1 font-semibold text-slate-100">Reference ranges</p>
                        <ul className="space-y-0.5">
                          <li>
                            <span className="font-semibold text-emerald-300">Optimal:</span> {metric.ranges.green}
                          </li>
                          <li>
                            <span className="font-semibold text-amber-300">Caution:</span> {metric.ranges.yellow}
                          </li>
                          <li>
                            <span className="font-semibold text-rose-300">Critical:</span> {metric.ranges.red}
                          </li>
                        </ul>
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-500">Source:</span>
                          <SourceTag source={metric.source} />
                          {metric.moreSources?.map((s) => <SourceTag key={s} source={s} />)}
                        </p>
                        {metric.thresholdNote && <p className="mt-1 text-[11px] text-slate-500">{metric.thresholdNote}</p>}
                      </div>

                      <div className="text-xs">
                        <p className="mb-1 font-semibold text-slate-100">How to perform exam</p>
                        <ol className="space-y-1">
                          {metric.howToMeasure.map((step, i) => {
                            const key = `${id}-${i}`;
                            return (
                              <li key={key}>
                                <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-slate-800/60">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400"
                                    checked={!!done[key]}
                                    onChange={(e) => setDone((d) => ({ ...d, [key]: e.target.checked }))}
                                  />
                                  <span className={done[key] ? 'text-slate-500 line-through' : 'text-slate-200'}>
                                    {i + 1}. {step}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {actions.length > 0 && (
                        <div className={`rounded-md border px-3 py-2 text-xs ${style.badge}`}>
                          <p className="mb-1 font-semibold">Countermeasures now</p>
                          <ul className="list-disc space-y-1 pl-4 text-slate-100">
                            {actions.map((fact) => (
                              <li key={fact.text}>
                                <FactLine fact={fact} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* General countermeasures for the body system */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Everyday countermeasures for this system
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-slate-200">
              {zone.countermeasures.map((fact) => (
                <li key={fact.text}>
                  <FactLine fact={fact} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
