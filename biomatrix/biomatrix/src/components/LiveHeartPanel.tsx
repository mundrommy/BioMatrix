import { Activity as ActivityIcon, Bluetooth, FastForward, GraduationCap, HeartPulse, Radio, Siren, Square, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiveCopilotInput } from '../data/autonomyCopilot';
import {
  DRILL_END_S,
  DRILL_PHASES,
  LIVE_SOURCE,
  LiveHeartMonitor,
  drillBpm,
  drillPhaseAt,
  type Activity,
  type LiveMode,
  type LiveSnapshot,
} from '../data/liveHeartMonitor';
import { SourceTag } from './ui';

const DRILL_NAME = 'Crew Training Drill';
const TICK_MS = 50;

export interface LiveHeart {
  snap: LiveSnapshot;
  /** Where the live stream comes from right now. */
  source: { kind: 'device'; name: string } | { kind: 'drill' } | null;
  drill: { sec: number; done: boolean } | null;
  /** For the Autonomy Copilot: the current alarm (null when none or dismissed). */
  copilotInput: LiveCopilotInput | null;
  pushReal: (bpm: number, deviceName: string) => void;
  startDrill: () => void;
  stopDrill: () => void;
  skipPhase: () => void;
  setActivity: (a: Activity) => void;
  dismissAlarm: () => void;
}

/**
 * Owns the Live Heart Monitor. Real heart-rate readings come in with pushReal (from the
 * Bluetooth strap). The Crew Training Drill feeds simulated readings into the same monitor;
 * they never touch the vitals form, the saved check-ins or the flight surgeon report.
 */
export function useLiveHeart(): LiveHeart {
  const monitor = useRef(new LiveHeartMonitor());
  const [snap, setSnap] = useState<LiveSnapshot>(() => monitor.current.snapshot());
  const [source, setSource] = useState<LiveHeart['source']>(null);
  const [drill, setDrill] = useState<LiveHeart['drill']>(null);
  const drillRef = useRef<{ sim: number; lastSec: number; base: number; timer: number } | null>(null);

  const refresh = () => setSnap(monitor.current.snapshot());

  const pushReal = useCallback((bpm: number, deviceName: string) => {
    if (drillRef.current) return; // during a drill the strap still fills the vitals form, but not this monitor
    monitor.current.push({ t: Date.now(), bpm });
    setSource((s) => (s?.kind === 'device' && s.name === deviceName ? s : { kind: 'device', name: deviceName }));
    setSnap(monitor.current.snapshot());
  }, []);

  /** Push all drill readings up to (and including) simulated second `until`. */
  const feedDrill = (until: number) => {
    const d = drillRef.current;
    if (!d) return;
    const end = Math.min(Math.floor(until), DRILL_END_S);
    for (let sec = d.lastSec + 1; sec <= end; sec++) monitor.current.push({ t: d.base + sec * 1000, bpm: drillBpm(sec) });
    d.lastSec = Math.max(d.lastSec, end);
  };

  const finishIfDone = () => {
    const d = drillRef.current;
    if (!d) return;
    refresh();
    if (d.sim >= DRILL_END_S) {
      window.clearInterval(d.timer);
      setDrill({ sec: DRILL_END_S, done: true });
    } else {
      setDrill({ sec: d.sim, done: false });
    }
  };

  const stopDrill = useCallback(() => {
    if (drillRef.current) window.clearInterval(drillRef.current.timer);
    drillRef.current = null;
    monitor.current = new LiveHeartMonitor(); // drill data is thrown away
    setDrill(null);
    setSource(null);
    setSnap(monitor.current.snapshot());
  }, []);

  const startDrill = useCallback(() => {
    if (drillRef.current) window.clearInterval(drillRef.current.timer);
    monitor.current = new LiveHeartMonitor();
    const d = { sim: 0, lastSec: -1, base: Math.floor(Date.now() / 60_000) * 60_000, timer: 0 };
    drillRef.current = d;
    feedDrill(0);
    d.timer = window.setInterval(() => {
      const cur = drillRef.current;
      if (!cur) return;
      cur.sim = Math.min(DRILL_END_S, cur.sim + (drillPhaseAt(cur.sim).speed * TICK_MS) / 1000);
      feedDrill(cur.sim);
      finishIfDone();
    }, TICK_MS);
    setSource({ kind: 'drill' });
    setDrill({ sec: 0, done: false });
    refresh();
  }, []);

  /** Fast-forward to the start of the next phase (all readings in between are still analysed). */
  const skipPhase = useCallback(() => {
    const d = drillRef.current;
    if (!d) return;
    const next = DRILL_PHASES.find((p) => p.startS > d.sim);
    d.sim = next ? next.startS : DRILL_END_S;
    feedDrill(d.sim);
    finishIfDone();
  }, []);

  const setActivity = useCallback((a: Activity) => {
    monitor.current.setActivity(a, monitor.current.snapshot().lastT ?? Date.now());
    setSnap(monitor.current.snapshot());
  }, []);

  const dismissAlarm = useCallback(() => {
    monitor.current.dismissAlarm();
    setSnap(monitor.current.snapshot());
  }, []);

  useEffect(() => () => {
    if (drillRef.current) window.clearInterval(drillRef.current.timer);
  }, []);

  const copilotInput = useMemo<LiveCopilotInput | null>(
    () =>
      snap.alarm && source
        ? {
            alarm: snap.alarm,
            drill: source.kind === 'drill',
            activity: snap.activity,
            sourceName: source.kind === 'drill' ? DRILL_NAME : source.name,
          }
        : null,
    [snap.alarm, snap.activity, source],
  );

  return { snap, source, drill, copilotInput, pushReal, startDrill, stopDrill, skipPhase, setActivity, dismissAlarm };
}

const MODE_STYLE: Record<LiveMode, { label: string; chip: string; desc: string }> = {
  NOMINAL_CRUISE: {
    label: 'Nominal cruise',
    chip: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200',
    desc: 'Stable. Saving power and bandwidth.',
  },
  DRIFT_WATCH: {
    label: 'Drift watch',
    chip: 'border-amber-400/60 bg-amber-400/15 text-amber-200',
    desc: 'Slow change detected. Watching more closely.',
  },
  BURST_CAPTURE: {
    label: 'Burst capture',
    chip: 'live-burst border-rose-400/70 bg-rose-500/20 text-rose-100',
    desc: 'Acute event. Recording every reading.',
  },
};

/** Last 60 seconds as a small line chart. */
function Sparkline({ snap }: { snap: LiveSnapshot }) {
  const pts = snap.window;
  if (pts.length < 2 || snap.lastT === null) {
    return <div className="flex h-16 items-center justify-center text-[11px] text-slate-500">Waiting for live readings...</div>;
  }
  const W = 300;
  const H = 64;
  const lo = Math.min(40, ...pts.map((p) => p.bpm));
  const hi = Math.max(150, ...pts.map((p) => p.bpm));
  const x = (t: number) => ((t - (snap.lastT! - 60_000)) / 60_000) * W;
  const y = (b: number) => H - ((b - lo) / (hi - lo)) * (H - 6) - 3;
  const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.bpm).toFixed(1)}`).join(' ');
  const stroke = snap.mode === 'BURST_CAPTURE' ? '#fb7185' : snap.mode === 'DRIFT_WATCH' ? '#fbbf24' : '#34d399';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" role="img" aria-label="Heart rate, last 60 seconds">
      {[60, 100, 120].map((b) => (
        <g key={b}>
          <line x1="0" x2={W} y1={y(b)} y2={y(b)} stroke={b === 120 ? '#fb718566' : '#33415588'} strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(pts[pts.length - 1].t)} cy={y(pts[pts.length - 1].bpm)} r="3" fill={stroke} />
    </svg>
  );
}

interface LiveHeartPanelProps {
  live: LiveHeart;
  /** Names of connected devices that stream heart rate. */
  hasHeartDevice: boolean;
  now: Date;
  onShowSteps: () => void;
}

/**
 * Live heart monitor: adaptive telemetry modes, acute alarms, drift countdown and the
 * Crew Training Drill. Only heart rate streams live; every other value stays a single reading.
 */
export function LiveHeartPanel({ live, hasHeartDevice, now, onShowSteps }: LiveHeartPanelProps) {
  const { snap, source, drill } = live;
  const mode = MODE_STYLE[snap.mode];
  const isDrill = source?.kind === 'drill';
  const stale = !isDrill && snap.lastT !== null && now.getTime() - snap.lastT > 15_000;
  const phase = drill ? drillPhaseAt(Math.min(drill.sec, DRILL_END_S - 0.001)) : null;
  const phaseIndex = phase ? DRILL_PHASES.indexOf(phase) : -1;

  return (
    <section
      className={`panel-glow reveal rounded-xl border bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur-md ${
        snap.mode === 'BURST_CAPTURE' ? 'border-rose-400/60' : 'border-slate-700/60'
      }`}
      aria-label="Live heart monitor"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2.5">
        <HeartPulse className={`h-4 w-4 ${snap.bpm ? 'live-heart text-rose-300' : 'text-slate-400'}`} aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Live heart monitor</h2>
        {source && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${mode.chip}`} aria-live="polite">
            {mode.label}
          </span>
        )}
        {isDrill && (
          <span className="drill-badge ml-auto rounded border border-amber-300/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
            Training drill — simulated HR
          </span>
        )}
      </header>

      <div className="space-y-3 p-4">
        {!source ? (
          <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-3 text-xs text-slate-300">
            <p className="flex items-start gap-2">
              <Bluetooth className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              {hasHeartDevice
                ? 'Heart-rate strap connected: waiting for the first reading...'
                : 'Connect a Bluetooth heart-rate strap in "Vitals input" to watch your heart rate second by second, or practise with a training drill.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="font-mono text-4xl font-bold leading-none text-slate-50">
                {snap.bpm ?? '--'}
                <span className="ml-1 text-sm font-normal text-slate-400">bpm</span>
              </p>
              {snap.delta15 !== null && (
                <p className={`font-mono text-xs ${Math.abs(snap.delta15) >= 25 ? 'text-rose-300' : 'text-slate-400'}`}>
                  {snap.delta15 >= 0 ? '+' : '−'}
                  {Math.abs(Math.round(snap.delta15))} bpm / 15 s
                </p>
              )}
              <p className="ml-auto text-[11px] text-slate-400">
                {isDrill ? DRILL_NAME : `From ${source.name}`}
                {stale && <span className="ml-1 text-amber-300">· no data for {Math.round((now.getTime() - snap.lastT!) / 1000)} s</span>}
              </p>
            </div>
            <Sparkline snap={snap} />
            <p className="text-[11px] text-slate-500">{mode.desc}</p>
          </>
        )}

        {/* Activity: a fast rise is normal during exercise, so it changes the rules */}
        <div role="radiogroup" aria-label="Current activity" className="grid grid-cols-2 gap-1">
          {(['rest', 'exercise'] as Activity[]).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={snap.activity === a}
              onClick={() => live.setActivity(a)}
              disabled={isDrill}
              className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                snap.activity === a ? 'border-sky-300 bg-sky-400/20 text-sky-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
              }`}
            >
              <ActivityIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {a === 'rest' ? 'At rest' : 'Exercising / EVA work'}
            </button>
          ))}
        </div>

        {/* Acute alarm */}
        {snap.alarm && (
          <div className={`rounded-md border-2 px-3 py-2 ${isDrill ? 'border-amber-300/70 bg-amber-400/10' : 'border-rose-400/70 bg-rose-500/15'}`} role="alert">
            <div className="flex items-start gap-2">
              <Siren className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold text-rose-100">
                  {isDrill && <span className="mr-1 text-amber-200">[DRILL]</span>}
                  Acute heart-rate alarm
                </p>
                <p className="text-xs text-slate-200">{snap.alarm.text}</p>
                <p className="mt-1 text-xs text-slate-300">
                  High-resolution capture is on. The steps are in the Autonomy Copilot — no need to wait for Earth.
                </p>
              </div>
              <button type="button" onClick={live.dismissAlarm} aria-label="Dismiss alarm" className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:text-white">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={onShowSteps}
              className="mt-2 flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300/60 bg-rose-500/25 px-3 text-xs font-semibold text-rose-50 hover:bg-rose-500/35"
            >
              Show the steps
            </button>
          </div>
        )}

        {/* Slow drift: countdown */}
        {snap.drift && (
          <p className="rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            {snap.drift.minutesToLimit !== null && (
              <span className="mr-2 inline-block rounded bg-amber-400/20 px-1.5 py-0.5 font-mono font-bold">
                ⏱ {snap.drift.minutesToLimit > 720 ? '>12h' : `${Math.floor(snap.drift.minutesToLimit / 60)}h ${String(Math.round(snap.drift.minutesToLimit % 60)).padStart(2, '0')}m`}
              </span>
            )}
            {snap.drift.text}
          </p>
        )}

        {/* Telemetry: what the spacecraft would send to Earth */}
        {source && (
          <p className="flex items-start gap-2 text-[11px] text-slate-400">
            <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
            <span>
              Telemetry to Earth would send {snap.telemetry.rateText}: {snap.telemetry.packets} packets for {snap.telemetry.received} readings (
              <span className="font-semibold text-cyan-200">{snap.telemetry.savingPct}% less data</span> than streaming every reading).
            </span>
          </p>
        )}

        {/* Crew Training Drill */}
        <div className="rounded-md border border-dashed border-amber-400/40 bg-amber-400/5 px-3 py-2">
          {!drill ? (
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-xs text-slate-300">
                Practise a medical emergency with a simulated heart rate. Your real values and check-ins are not changed.
              </p>
              <button
                type="button"
                onClick={live.startDrill}
                className="btn-shine flex min-h-9 items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-400/15 px-3 text-xs font-semibold text-amber-50 hover:bg-amber-400/25"
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                Start Crew Training Drill
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-amber-100">
                  {drill.done ? 'Drill complete' : `Phase ${phaseIndex + 1} of ${DRILL_PHASES.length}: ${phase?.label}`}
                </span>
                {!drill.done && phase && (
                  <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-100">
                    {phase.speed === 1 ? 'real time' : `×${phase.speed} speed`}
                  </span>
                )}
                <span className="font-mono text-[11px] text-slate-400">
                  drill time {Math.floor(drill.sec / 60)}:{String(Math.floor(drill.sec % 60)).padStart(2, '0')}
                </span>
                <span className="ml-auto flex gap-1.5">
                  {!drill.done && (
                    <button type="button" onClick={live.skipPhase} className="flex min-h-8 items-center gap-1 rounded border border-slate-600 px-2 text-[11px] text-slate-200 hover:border-slate-400">
                      <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
                      Next phase
                    </button>
                  )}
                  <button type="button" onClick={live.stopDrill} className="flex min-h-8 items-center gap-1 rounded border border-slate-600 px-2 text-[11px] text-slate-200 hover:border-slate-400">
                    <Square className="h-3 w-3" aria-hidden="true" />
                    {drill.done ? 'Close drill' : 'Stop drill'}
                  </button>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400" style={{ width: `${(drill.sec / DRILL_END_S) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          Only heart rate streams live. Blood pressure, SpO2 and the other values stay single readings. <SourceTag source={LIVE_SOURCE.source} />
        </p>
      </div>
    </section>
  );
}
