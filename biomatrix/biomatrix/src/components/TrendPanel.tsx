import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  METRICS,
  TREND_OPTIONS,
  type DayRecord,
  type MetricId,
  type Vitals,
} from '../data/spaceHealthEngine';
import { SourceTag } from './ui';

const LINE_COLORS = ['#38bdf8', '#c084fc'];

interface TrendPanelProps {
  /** Previous check-ins, oldest first (today is added from the current values). */
  history: DayRecord[];
  vitals: Vitals;
  missionDay: number;
}

/** Trend of one indicator: up to 13 saved check-ins plus today's current value. */
export function TrendPanel({ history, vitals, missionDay }: TrendPanelProps) {
  const [metricId, setMetricId] = useState<MetricId>('sleep');
  const option = TREND_OPTIONS.find((o) => o.id === metricId) ?? TREND_OPTIONS[0];
  const metric = METRICS[option.id];

  const data = [
    ...history.slice(-13).map((d) => {
      const row: Record<string, number | string> = { label: `D${d.day}` };
      option.keys.forEach((k) => (row[k] = d[k]));
      return row;
    }),
    (() => {
      const row: Record<string, number | string> = { label: `D${missionDay} (today)` };
      option.keys.forEach((k) => (row[k] = vitals[k]));
      return row;
    })(),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          Indicator
          <select
            value={option.id}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
            className="min-h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"
          >
            {TREND_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {METRICS[o.id].label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-emerald-300">Optimal:</span> {metric.ranges.green}
          {metric.unit ? ` ${metric.unit}` : ''} <SourceTag source={metric.source} />
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" interval="preserveStartEnd" />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#334155"
              domain={['auto', 'auto']}
              unit={metric.unit === '%' ? '%' : undefined}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            {option.keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />}
            {option.keys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={metric.fields.find((f) => f.key === key)?.label ?? metric.label}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {history.length === 0
          ? 'Your trend builds up as you save a check-in each day. The point shown is today\'s value.'
          : 'Earlier points are your saved check-ins (up to 13). The final point is today\'s value and moves when you change the input.'}
      </p>
    </div>
  );
}
