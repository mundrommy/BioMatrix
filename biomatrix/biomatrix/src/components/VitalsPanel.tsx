import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  METRICS,
  SYMPTOM_LABELS,
  ZONES,
  ZONE_ORDER,
  formatMetric,
  type Assessment,
  type MetricId,
  type NumericVitalKey,
  type SliderField,
  type Symptoms,
  type VisionCheck,
  type Vitals,
  type ZoneId,
} from '../data/spaceHealthEngine';
import { ZONE_ICONS } from './AstronautMap';
import { PVTGame } from './PVTGame';
import { STATUS_STYLE, StatusBadge } from './ui';

interface VitalsPanelProps {
  vitals: Vitals;
  symptoms: Symptoms;
  assessment: Assessment;
  onVital: (key: NumericVitalKey, value: number) => void;
  onVision: (value: VisionCheck) => void;
  onSpe: (value: boolean) => void;
  onSymptom: (key: keyof Symptoms, value: boolean) => void;
  onOpenZone: (zone: ZoneId) => void;
}

const VISION_OPTIONS: { value: VisionCheck; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'mild', label: 'Mild blur' },
  { value: 'severe', label: 'Severe change' },
];

/**
 * Number box next to a slider. The typed text is kept locally and only applied
 * (and clamped to the allowed range) on Enter or when the field loses focus,
 * so typing "120" is not interrupted after the first digit.
 */
function NumberField({
  field,
  value,
  label,
  onCommit,
}: {
  field: SliderField;
  value: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(field.max, Math.max(field.min, n));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      min={field.min}
      max={field.max}
      step={field.step}
      value={text}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      className="w-[4.5rem] shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-right font-mono text-xs text-slate-100"
    />
  );
}

export function VitalsPanel({
  vitals,
  symptoms,
  assessment,
  onVital,
  onVision,
  onSpe,
  onSymptom,
  onOpenZone,
}: VitalsPanelProps) {
  const renderMetric = (id: MetricId) => {
    const metric = METRICS[id];
    const evaluation = assessment.metrics[id];
    const style = STATUS_STYLE[evaluation.status];

    return (
      <div key={id} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-slate-100">{metric.label}</span>
          <span className="ml-auto font-mono text-sm font-semibold text-slate-50">
            {formatMetric(id, vitals)}
            {metric.unit && <span className="ml-1 text-xs font-normal text-slate-400">{metric.unit}</span>}
          </span>
          <StatusBadge status={evaluation.status} />
        </div>

        {evaluation.status !== 'green' && <p className={`mt-0.5 text-xs ${style.text}`}>{evaluation.note}</p>}

        {/* Sliders for numeric values */}
        {metric.fields.map((field) => (
          <label key={field.key} className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
            {metric.fields.length > 1 && <span className="w-16 shrink-0">{field.label}</span>}
            <span className="sr-only">
              {metric.label}
              {metric.fields.length > 1 ? ` ${field.label}` : ''} ({metric.unit})
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={vitals[field.key]}
              onChange={(e) => onVital(field.key, Number(e.target.value))}
              className="h-6 w-full cursor-pointer"
            />
            <NumberField
              field={field}
              value={vitals[field.key]}
              label={`${metric.label}${metric.fields.length > 1 ? ` ${field.label}` : ''} value`}
              onCommit={(n) => onVital(field.key, n)}
            />
          </label>
        ))}

        {/* Visual check: three options */}
        {id === 'vision' && (
          <div role="radiogroup" aria-label="Visual check result" className="mt-1.5 grid grid-cols-3 gap-1">
            {VISION_OPTIONS.map((opt) => {
              const active = vitals.vision === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onVision(opt.value)}
                  className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition ${
                    active
                      ? 'border-sky-300 bg-sky-400/20 text-sky-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Solar Particle Event: on/off */}
        {id === 'spe' && (
          <label className="mt-1.5 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={vitals.spe} onChange={(e) => onSpe(e.target.checked)} />
            Solar Particle Event in progress
          </label>
        )}

        {id === 'reactionTime' && (
          <div className="mt-2">
            <PVTGame onResult={(ms) => onVital('reactionTime', Math.min(800, Math.max(150, ms)))} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Symptoms feed the blood pressure, heart rate, breathing and vision rules */}
      <fieldset className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Symptoms right now</legend>
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {(Object.keys(SYMPTOM_LABELS) as (keyof Symptoms)[]).map((key) => (
            <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-400"
                checked={symptoms[key]}
                onChange={(e) => onSymptom(key, e.target.checked)}
              />
              {SYMPTOM_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      {ZONE_ORDER.map((zoneId) => (
        <div key={zoneId}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] ${STATUS_STYLE[assessment.zones[zoneId]].text}`}>
              {ZONE_ICONS[zoneId]}
              {ZONES[zoneId].name}
            </h3>
            <button
              type="button"
              onClick={() => onOpenZone(zoneId)}
              className="flex min-h-8 items-center gap-1 rounded px-1.5 text-[11px] text-sky-300 hover:text-sky-100"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              How to measure
            </button>
          </div>
          <div className="space-y-2">{ZONES[zoneId].metrics.map(renderMetric)}</div>
        </div>
      ))}
    </div>
  );
}
