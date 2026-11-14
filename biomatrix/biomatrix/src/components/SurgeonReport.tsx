import { Check, Copy, Download, Printer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  DISCLAIMER,
  METRICS,
  METRIC_ORDER,
  SYMPTOM_LABELS,
  formatMetric,
  missionDayFor,
  sourceLabel,
  type Assessment,
  type CheckIn,
  type DeviceSources,
  type Environment,
  type MetricId,
  type Status,
  type Symptoms,
  type Vitals,
} from '../data/spaceHealthEngine';

interface SurgeonReportProps {
  assessment: Assessment;
  vitals: Vitals;
  symptoms: Symptoms;
  sources: DeviceSources;
  env: Environment;
  missionDay: number;
  missionStart: string;
  checkIns: CheckIn[];
  /** Time of today's saved check-in, or null if the values are not saved yet. */
  savedAt: string | null;
  onClose: () => void;
}

const STATUS_WORD: Record<Status, string> = { green: 'Optimal', yellow: 'Caution', red: 'Critical' };
const STATUS_CLASS: Record<Status, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  yellow: 'bg-amber-100 text-amber-900 border-amber-300',
  red: 'bg-rose-100 text-rose-800 border-rose-300',
};

/** Columns of the history table: the main indicators, one per column. */
const HISTORY_COLUMNS: { label: string; value: (v: Vitals) => string }[] = [
  { label: 'BP (mm Hg)', value: (v) => `${Math.round(v.systolic)}/${Math.round(v.diastolic)}` },
  { label: 'HR (bpm)', value: (v) => String(Math.round(v.heartRate)) },
  { label: 'SpO2 (%)', value: (v) => String(Math.round(v.spo2)) },
  { label: 'Glucose (mg/dL)', value: (v) => String(Math.round(v.glucose)) },
  { label: 'Temp (°C)', value: (v) => v.temperature.toFixed(1) },
  { label: 'Sleep (h)', value: (v) => v.sleep.toFixed(1) },
  { label: 'Mood (/10)', value: (v) => String(Math.round(v.mood)) },
];

const dateTime = (d: Date) =>
  d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

/** Where a value came from: the device name, or "Manual". */
function sourceOf(id: MetricId, sources: DeviceSources): string {
  const keys = METRICS[id].fields.map((f) => f.key);
  return keys.map((k) => sources[k]).find(Boolean) ?? 'Manual';
}

/**
 * Flight surgeon report: everything a doctor on Earth needs to review the astronaut's
 * health in one document. It can be printed / saved as PDF, downloaded as text, or copied.
 */
export function SurgeonReport(props: SurgeonReportProps) {
  const { assessment, vitals, symptoms, sources, env, missionDay, missionStart, checkIns, savedAt, onClose } = props;
  const [generatedAt] = useState(() => new Date());
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { triage } = assessment;
  const reportedSymptoms = (Object.keys(SYMPTOM_LABELS) as (keyof Symptoms)[]).filter((k) => symptoms[k]);
  const history = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const fileDate = generatedAt.toISOString().slice(0, 10);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('printing-report');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('printing-report');
    };
  }, [onClose]);

  /** The same report as plain text, for downloading or pasting into a message. */
  const buildText = (): string => {
    const line = '-'.repeat(64);
    const out: string[] = [];
    out.push('BIOMATRIX - FLIGHT SURGEON REPORT', line);
    out.push(`Generated:      ${dateTime(generatedAt)}`);
    out.push(`Mission:        ${env.name}, Mission Day ${missionDay} (start ${longDate(missionStart)})`);
    out.push(`Earth link:     ${env.commDelay.text}${env.autonomousTriage ? ' (autonomous triage active)' : ''}`);
    out.push(`Check-in:       ${savedAt ? `saved today at ${dateTime(new Date(savedAt))}` : 'current values, not yet saved'}`);
    out.push('', 'TRIAGE', line);
    out.push(`Level ${triage.level} of 3: ${triage.title}`);
    out.push(triage.reason);
    out.push('', 'OUT OF RANGE', line);
    if (triage.findings.length === 0) out.push('None. All indicators are in range.');
    for (const f of triage.findings) {
      const m = METRICS[f.metric];
      out.push(
        `- ${m.label}: ${f.value}${m.unit ? ` ${m.unit}` : ''} [${STATUS_WORD[f.status]}] ${f.note}${f.persisting ? ' (also at last check-in)' : ''}`,
      );
    }
    out.push('', 'SYMPTOMS REPORTED', line);
    out.push(reportedSymptoms.length ? reportedSymptoms.map((k) => `- ${SYMPTOM_LABELS[k]}`).join('\n') : 'None.');
    out.push('', 'ALL READINGS', line);
    for (const id of METRIC_ORDER) {
      const m = METRICS[id];
      out.push(
        `- ${m.label}: ${formatMetric(id, vitals)}${m.unit ? ` ${m.unit}` : ''} [${STATUS_WORD[assessment.metrics[id].status]}] (source: ${sourceOf(id, sources)})`,
      );
    }
    if (triage.level > 0) {
      out.push('', 'STEPS FOR THE ASTRONAUT', line);
      triage.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
      out.push('', 'RECOMMENDED COUNTERMEASURES', line);
      triage.actions.forEach((a) => out.push(`- ${a.text} (${sourceLabel(a.source)})`));
    }
    out.push('', `HISTORY (last ${history.length} saved check-in${history.length === 1 ? '' : 's'})`, line);
    if (history.length === 0) out.push('No saved check-ins yet.');
    for (const c of history) {
      out.push(
        `${c.date} (Day ${missionDayFor(c.date, missionStart)}): ` +
          HISTORY_COLUMNS.map((col) => `${col.label} ${col.value(c.vitals)}`).join(', '),
      );
    }
    out.push('', line, DISCLAIMER, 'Thresholds marked "Illustrative" in BioMatrix are design choices, not NASA/CSA thresholds.');
    return out.join('\n');
  };

  const download = () => {
    const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomatrix-report-${fileDate}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      download(); // clipboard blocked: give the file instead
    }
  };

  const Th = ({ children }: { children: string }) => (
    <th className="border-b border-slate-300 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
  const Badge = ({ status }: { status: Status }) => (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_CLASS[status]}`}>
      {STATUS_WORD[status]}
    </span>
  );
  const Heading = ({ children }: { children: string }) => (
    <h3 className="mb-2 mt-6 border-b-2 border-slate-800 pb-1 text-sm font-bold uppercase tracking-[0.12em] text-slate-800">{children}</h3>
  );

  return (
    <div className="report-overlay fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Flight surgeon report">
      <div className="report-sheet w-full max-w-3xl">
        {/* Toolbar (not printed) */}
        <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-shine flex min-h-10 items-center gap-2 rounded-md border border-sky-300/60 bg-sky-400/20 px-3 text-sm font-semibold text-sky-50 hover:bg-sky-400/30"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={download}
            className="flex min-h-10 items-center gap-2 rounded-md border border-slate-600 px-3 text-sm text-slate-100 hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download (.txt)
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex min-h-10 items-center gap-2 rounded-md border border-slate-600 px-3 text-sm text-slate-100 hover:bg-slate-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* The report itself (this part is printed) */}
        <article className="print-report rounded-xl bg-white px-5 py-6 text-slate-900 shadow-2xl sm:px-8">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b-4 border-slate-900 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">BioMatrix</p>
              <h2 className="text-2xl font-bold">Flight Surgeon Report</h2>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Generated {dateTime(generatedAt)}</p>
              <p>{savedAt ? `Check-in saved ${dateTime(new Date(savedAt))}` : 'Current values (not yet saved)'}</p>
            </div>
          </header>

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold">Mission: </dt>
              <dd className="inline">{env.name}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Mission day: </dt>
              <dd className="inline">
                {missionDay} (start {longDate(missionStart)})
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-semibold">Earth link: </dt>
              <dd className="inline">
                {env.commDelay.text}
                {env.autonomousTriage ? ' (autonomous triage active)' : ''}
              </dd>
            </div>
          </dl>

          <Heading>Triage</Heading>
          <div
            className={`rounded-lg border-2 px-3 py-2 ${
              triage.level === 3
                ? 'border-rose-400 bg-rose-50'
                : triage.level === 2
                  ? 'border-orange-400 bg-orange-50'
                  : triage.level === 1
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-emerald-400 bg-emerald-50'
            }`}
          >
            <p className="text-base font-bold">
              Level {triage.level} of 3: {triage.title}
            </p>
            <p className="text-sm">{triage.reason}</p>
          </div>

          <Heading>Out of range</Heading>
          {triage.findings.length === 0 ? (
            <p className="text-sm">None. All indicators are in range.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <Th>Indicator</Th>
                  <Th>Value</Th>
                  <Th>Status</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {triage.findings.map((f) => (
                  <tr key={f.metric} className="border-b border-slate-200">
                    <td className="px-2 py-1.5 font-semibold">{METRICS[f.metric].label}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {f.value}
                      {METRICS[f.metric].unit ? ` ${METRICS[f.metric].unit}` : ''}
                    </td>
                    <td className="px-2 py-1.5">
                      <Badge status={f.status} />
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">
                      {f.note}
                      {f.persisting ? ' (also at last check-in)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Heading>Symptoms reported</Heading>
          <p className="text-sm">{reportedSymptoms.length ? reportedSymptoms.map((k) => SYMPTOM_LABELS[k]).join(', ') : 'None.'}</p>

          {triage.level > 0 && (
            <>
              <Heading>Steps for the astronaut</Heading>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm">
                {triage.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <Heading>Recommended countermeasures</Heading>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {triage.actions.map((a) => (
                  <li key={a.text}>
                    {a.text} <span className="text-xs text-slate-500">({sourceLabel(a.source)})</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Heading>All readings</Heading>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Indicator</Th>
                <Th>Value</Th>
                <Th>Status</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ORDER.map((id) => (
                <tr key={id} className="border-b border-slate-200">
                  <td className="px-2 py-1">{METRICS[id].label}</td>
                  <td className="px-2 py-1 font-mono">
                    {formatMetric(id, vitals)}
                    {METRICS[id].unit ? ` ${METRICS[id].unit}` : ''}
                  </td>
                  <td className="px-2 py-1">
                    <Badge status={assessment.metrics[id].status} />
                  </td>
                  <td className="px-2 py-1 text-slate-600">{sourceOf(id, sources)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Heading>History</Heading>
          {history.length === 0 ? (
            <p className="text-sm">No saved check-ins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Date</Th>
                    {HISTORY_COLUMNS.map((c) => (
                      <Th key={c.label}>{c.label}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((c) => (
                    <tr key={c.date} className="border-b border-slate-200">
                      <td className="whitespace-nowrap px-2 py-1">
                        {c.date} <span className="text-slate-500">(Day {missionDayFor(c.date, missionStart)})</span>
                      </td>
                      {HISTORY_COLUMNS.map((col) => (
                        <td key={col.label} className="px-2 py-1 font-mono">
                          {col.value(c.vitals)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="mt-6 border-t border-slate-300 pt-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">{DISCLAIMER}</p>
            <p>Thresholds marked "Illustrative" in BioMatrix are design choices, not NASA/CSA thresholds.</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
