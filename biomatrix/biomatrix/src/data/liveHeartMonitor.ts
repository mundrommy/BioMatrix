/**
 * BioMatrix Live Heart Monitor: second-by-second heart-rate analysis for the one sensor that
 * really streams live (a standard Bluetooth heart-rate strap), plus the Crew Training Drill.
 *
 * Two timescales on the same stream:
 *  - Acute (seconds): a rolling 60-second ring buffer; a sudden jump or drop (change over 15 s)
 *    or a value outside the limits, confirmed by several readings in a row so a strap that loses
 *    skin contact does not raise a false alarm.
 *  - Slow (minutes to hours): one summary packet per minute; a sustained rise in resting heart
 *    rate gives a countdown to the 120 bpm red limit.
 *
 * Adaptive telemetry modes (what the spacecraft would send to Earth):
 *  - NOMINAL_CRUISE: stable, 1 summary packet per minute.
 *  - DRIFT_WATCH:    slow rise at rest, 1 packet every 10 s and a time-to-limit countdown.
 *  - BURST_CAPTURE:  acute alarm, every reading (about 1 per second) is kept.
 *
 * All rule numbers are team design choices (ILLUSTRATIVE), except the normal resting range
 * (60-100 bpm, Mayo Clinic) and the app's existing red limits for heart rate.
 */

import { ILLUSTRATIVE, type Fact } from './spaceHealthEngine';

export type LiveMode = 'NOMINAL_CRUISE' | 'DRIFT_WATCH' | 'BURST_CAPTURE';
export type Activity = 'rest' | 'exercise';
export type AlarmKind = 'spike' | 'drop' | 'high' | 'low';

export interface HrSample {
  /** Time in milliseconds (real clock for a device, simulated clock for the drill). */
  t: number;
  bpm: number;
}

export interface LiveAlarm {
  kind: AlarmKind;
  t: number;
  /** Full sentence for the alarm banner. */
  text: string;
  /** Short evidence label, e.g. "+46 bpm in 6 s". */
  short: string;
  bpm: number;
  activity: Activity;
}

export interface MinutePacket {
  /** Start of the minute, ms. */
  t: number;
  mean: number;
  min: number;
  max: number;
  activity: Activity;
}

export interface DriftInfo {
  /** Change in bpm per minute (0 when the alert is about a high level, not a rise). */
  slopePerMin: number;
  /** Minutes until the 120 bpm red limit at this trend, or null if not rising. */
  minutesToLimit: number | null;
  text: string;
}

export interface LiveSnapshot {
  mode: LiveMode;
  bpm: number | null;
  /** Time of the last reading, ms. */
  lastT: number | null;
  /** Readings of the last 60 seconds, oldest first. */
  window: HrSample[];
  /** Change over the last 15 seconds, bpm. */
  delta15: number | null;
  /** Latest alarm, kept until dismissed. */
  alarm: LiveAlarm | null;
  drift: DriftInfo | null;
  activity: Activity;
  /** Number of one-minute summary packets so far. */
  minutes: number;
  telemetry: {
    received: number;
    packets: number;
    /** Share of readings that did not need to be sent, 0-100. */
    savingPct: number;
    rateText: string;
  };
}

/** Rule numbers (team design, see the file header). */
export const LIVE_RULES = {
  windowS: 60,
  acuteWindowS: 15,
  /** A change of at least this many bpm within 15 s is "sudden". */
  acuteChange: 25,
  /** Readings in a row needed to confirm an alarm (filters strap glitches). */
  confirm: 3,
  restHigh: 120,
  exerciseHigh: 180,
  low: 50,
  lowConfirm: 10,
  /** Burst capture continues this long after the last abnormal reading. */
  burstHoldS: 30,
  /** A gap longer than this resets the confirmation counters. */
  gapS: 10,
  driftMinPackets: 15,
  driftMaxPackets: 30,
  driftMinSlope: 0.4,
  driftMinR2: 0.6,
  driftElevated: 100,
  redLimit: 120,
  recoveryCheckS: 180,
  recoveryHigh: 100,
} as const;

export const LIVE_SOURCE: Fact = {
  text: 'Alarm, drift and telemetry rules are a team design for this prototype, not NASA limits.',
  source: ILLUSTRATIVE,
};

// ---------------------------------------------------------------------------
// Ring buffer
// ---------------------------------------------------------------------------

/** Fixed-size circular buffer: pushing past the capacity overwrites the oldest item. */
export class RingBuffer<T> {
  private items: (T | undefined)[];
  private start = 0;
  private size = 0;

  constructor(readonly capacity: number) {
    this.items = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.items[(this.start + this.size) % this.capacity] = item;
    if (this.size < this.capacity) this.size++;
    else this.start = (this.start + 1) % this.capacity;
  }

  get length(): number {
    return this.size;
  }

  last(): T | undefined {
    return this.size === 0 ? undefined : this.items[(this.start + this.size - 1) % this.capacity];
  }

  /** Items oldest first. */
  toArray(): T[] {
    const out: T[] = [];
    for (let k = 0; k < this.size; k++) out.push(this.items[(this.start + k) % this.capacity] as T);
    return out;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fit(xs: number[], ys: number[]): { slope: number; r2: number } {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return { slope: 0, r2: 0 };
  return { slope: sxy / sxx, r2: (sxy * sxy) / (sxx * syy) };
}

/** 48 -> "48 min", 100 -> "1h 40m". */
export function formatDuration(minutes: number): string {
  if (minutes > 12 * 60) return 'more than 12 hours';
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const RATE_TEXT: Record<LiveMode, string> = {
  NOMINAL_CRUISE: '1 summary packet per minute',
  DRIFT_WATCH: '1 packet every 10 seconds',
  BURST_CAPTURE: 'every reading (high-resolution, about 1 per second)',
};

// ---------------------------------------------------------------------------
// The monitor
// ---------------------------------------------------------------------------

export class LiveHeartMonitor {
  private buf = new RingBuffer<HrSample>(150);
  /** The last 3 raw readings, for the median filter. */
  private raw = new RingBuffer<number>(3);
  private minuteBuf = new RingBuffer<MinutePacket>(240);
  private current: { t: number; sum: number; n: number; min: number; max: number; activity: Activity } | null = null;
  private counters = { rise: 0, drop: 0, high: 0, low: 0 };
  private burstUntil = -Infinity;
  private alarm: LiveAlarm | null = null;
  private activity: Activity = 'rest';
  /** When the astronaut switched from exercise to rest (for the recovery check). */
  private restSince: number | null = null;
  private recoveryNote: string | null = null;
  private drift: DriftInfo | null = null;
  private received = 0;
  private packets = 0;
  private lastPacketT = -Infinity;
  private lastT: number | null = null;

  setActivity(activity: Activity, t: number): void {
    if (activity === this.activity) return;
    this.restSince = activity === 'rest' ? t : null;
    this.recoveryNote = null;
    this.activity = activity;
    this.counters = { rise: 0, drop: 0, high: 0, low: 0 };
  }

  dismissAlarm(): void {
    this.alarm = null;
  }

  push(input: HrSample): void {
    const R = LIVE_RULES;
    if (!Number.isFinite(input.bpm) || input.bpm <= 0) return;
    if (this.lastT !== null && input.t <= this.lastT) return; // out of order or duplicate
    if (this.lastT !== null && input.t - this.lastT > R.gapS * 1000) {
      this.counters = { rise: 0, drop: 0, high: 0, low: 0 };
      this.raw = new RingBuffer<number>(3);
    }
    // Median of the last 3 readings: removes single-reading glitches (strap losing skin contact).
    this.raw.push(input.bpm);
    const sorted = this.raw.toArray().sort((a, b) => a - b);
    const sample: HrSample = { t: input.t, bpm: sorted[Math.floor((sorted.length - 1) / 2)] };

    // Acute analysis uses the readings of the last 15 s before this one.
    const recent = this.buf.toArray().filter((s) => s.t >= sample.t - R.acuteWindowS * 1000);
    this.buf.push(sample);
    this.received++;
    this.aggregateMinute(sample);

    // Lowest / highest of the last 15 s; for the message, the latest reading near that level
    // (so "in 6 s" reports when the change really started).
    const minBpm = Math.min(...recent.map((s) => s.bpm));
    const maxBpm = Math.max(...recent.map((s) => s.bpm));
    const lowest = recent.length ? [...recent].reverse().find((s) => s.bpm <= minBpm + 3) ?? null : null;
    const highest = recent.length ? [...recent].reverse().find((s) => s.bpm >= maxBpm - 3) ?? null : null;
    const rise = recent.length ? sample.bpm - minBpm : 0;
    const fall = recent.length ? maxBpm - sample.bpm : 0;
    const atRest = this.activity === 'rest';
    // A fast fall right after exercise is normal recovery, so it only counts during exercise
    // or at rest when the astronaut has not just stopped exercising.
    const recovering = atRest && this.restSince !== null && sample.t - this.restSince < R.recoveryCheckS * 1000;

    // Right after exercise the exercise limit still applies while the heart rate comes down.
    const limit = atRest && !recovering ? R.restHigh : R.exerciseHigh;
    const c = this.counters;
    c.rise = atRest && !recovering && rise >= R.acuteChange ? c.rise + 1 : 0;
    // A fall back down from an abnormally high value is a recovery, not a new event.
    c.drop = !recovering && fall >= R.acuteChange && maxBpm <= limit ? c.drop + 1 : 0;
    c.high = sample.bpm > limit ? c.high + 1 : 0;
    c.low = sample.bpm < R.low ? c.low + 1 : 0;

    let found: LiveAlarm | null = null;
    const secs = (s: HrSample | null) => (s ? Math.max(1, Math.round((sample.t - s.t) / 1000)) : 0);
    const base = { t: sample.t, bpm: sample.bpm, activity: this.activity };
    if (c.rise >= R.confirm && lowest) {
      found = {
        ...base,
        kind: 'spike',
        short: `+${Math.round(rise)} bpm in ${secs(lowest)} s`,
        text: `Sudden jump at rest: ${Math.round(lowest.bpm)} → ${Math.round(sample.bpm)} bpm in ${secs(lowest)} s, confirmed by ${R.confirm} readings in a row.`,
      };
    } else if (c.drop >= R.confirm && highest) {
      found = {
        ...base,
        kind: 'drop',
        short: `−${Math.round(fall)} bpm in ${secs(highest)} s`,
        text: `Sudden drop: ${Math.round(highest.bpm)} → ${Math.round(sample.bpm)} bpm in ${secs(highest)} s, confirmed by ${R.confirm} readings in a row.`,
      };
    } else if (c.high >= R.confirm) {
      found = {
        ...base,
        kind: 'high',
        short: `${Math.round(sample.bpm)} bpm ${limit === R.restHigh ? 'at rest' : 'during or after exercise'}`,
        text: `Heart rate ${Math.round(sample.bpm)} bpm ${limit === R.restHigh ? 'at rest' : 'during or after exercise'}, above the ${limit} bpm limit.`,
      };
    } else if (c.low >= R.lowConfirm) {
      found = {
        ...base,
        kind: 'low',
        short: `${Math.round(sample.bpm)} bpm for ${R.lowConfirm} s`,
        text: `Heart rate ${Math.round(sample.bpm)} bpm, below ${R.low} bpm for ${R.lowConfirm} readings.`,
      };
    }

    const wasBurst = sample.t < this.burstUntil;
    if (found) {
      this.burstUntil = sample.t + R.burstHoldS * 1000;
      // Keep the first alarm of a burst (it names the root event), unless none is shown.
      if (!wasBurst || !this.alarm) this.alarm = found;
    }

    // Slow recovery after exercise.
    if (atRest && this.restSince !== null && sample.t - this.restSince >= R.recoveryCheckS * 1000) {
      const last30 = this.buf.toArray().filter((s) => s.t >= sample.t - 30_000);
      const mean = last30.reduce((a, s) => a + s.bpm, 0) / last30.length;
      this.recoveryNote =
        mean > R.recoveryHigh
          ? `Still ${Math.round(mean)} bpm ${Math.round(R.recoveryCheckS / 60)} minutes after stopping exercise: slow recovery. Rest and drink fluids.`
          : null;
      this.restSince = null;
    }
    if (this.recoveryNote && sample.bpm <= R.recoveryHigh) this.recoveryNote = null;

    // Telemetry packets that would be sent in the current mode.
    const mode = this.modeAt(sample.t);
    const interval = mode === 'BURST_CAPTURE' ? 0 : mode === 'DRIFT_WATCH' ? 10_000 : 60_000;
    if (sample.t - this.lastPacketT >= interval) {
      this.packets++;
      this.lastPacketT = sample.t;
    }
    this.lastT = sample.t;
  }

  private aggregateMinute(s: HrSample): void {
    const minute = Math.floor(s.t / 60_000) * 60_000;
    const cur = this.current;
    if (cur && cur.t !== minute) {
      this.minuteBuf.push({ t: cur.t, mean: cur.sum / cur.n, min: cur.min, max: cur.max, activity: cur.activity });
      this.drift = this.computeDrift();
      this.current = null;
    }
    if (!this.current) {
      this.current = { t: minute, sum: 0, n: 0, min: s.bpm, max: s.bpm, activity: this.activity };
    }
    const c = this.current;
    c.sum += s.bpm;
    c.n++;
    c.min = Math.min(c.min, s.bpm);
    c.max = Math.max(c.max, s.bpm);
    if (this.activity === 'exercise') c.activity = 'exercise';
  }

  /** Slow trend over the last 15-30 one-minute packets taken at rest. */
  private computeDrift(): DriftInfo | null {
    const R = LIVE_RULES;
    if (this.activity !== 'rest') return null;
    const all = this.minuteBuf.toArray();
    // Only the latest unbroken run of rest minutes.
    const run: MinutePacket[] = [];
    for (let i = all.length - 1; i >= 0 && run.length < R.driftMaxPackets; i--) {
      if (all[i].activity !== 'rest') break;
      if (run.length > 0 && run[0].t - all[i].t > 3 * 60_000) break;
      run.unshift(all[i]);
    }
    if (run.length < R.driftMinPackets) return null;
    const recent = run.slice(-R.driftMinPackets);
    const { slope, r2 } = fit(
      recent.map((p) => p.t / 60_000),
      recent.map((p) => p.mean),
    );
    const now = recent[recent.length - 1].mean;
    const avg = recent.reduce((a, p) => a + p.mean, 0) / recent.length;
    const rising = slope >= R.driftMinSlope && r2 >= R.driftMinR2;
    if (rising && now < R.redLimit) {
      const minutesToLimit = (R.redLimit - now) / slope;
      return {
        slopePerMin: slope,
        minutesToLimit,
        text: `Resting heart rate is rising about ${slope.toFixed(1)} bpm per minute (now ${Math.round(now)} bpm). At this trend it reaches the ${R.redLimit} bpm red limit in about ${formatDuration(minutesToLimit)}.`,
      };
    }
    if (avg > R.driftElevated) {
      return {
        slopePerMin: 0,
        minutesToLimit: null,
        text: `Resting heart rate has stayed above ${R.driftElevated} bpm for ${recent.length} minutes (average ${Math.round(avg)} bpm).`,
      };
    }
    return null;
  }

  private modeAt(t: number): LiveMode {
    if (t < this.burstUntil) return 'BURST_CAPTURE';
    if (this.drift || this.recoveryNote) return 'DRIFT_WATCH';
    return 'NOMINAL_CRUISE';
  }

  snapshot(): LiveSnapshot {
    const last = this.buf.last();
    const t = this.lastT;
    const window = t === null ? [] : this.buf.toArray().filter((s) => s.t >= t - LIVE_RULES.windowS * 1000);
    const first15 = t === null ? undefined : window.find((s) => s.t >= t - LIVE_RULES.acuteWindowS * 1000);
    const mode = t === null ? 'NOMINAL_CRUISE' : this.modeAt(t);
    const drift: DriftInfo | null =
      this.drift ?? (this.recoveryNote ? { slopePerMin: 0, minutesToLimit: null, text: this.recoveryNote } : null);
    return {
      mode,
      bpm: last ? last.bpm : null,
      lastT: t,
      window,
      delta15: last && first15 ? last.bpm - first15.bpm : null,
      alarm: this.alarm,
      drift: this.activity === 'rest' ? drift : null,
      activity: this.activity,
      minutes: this.minuteBuf.length,
      telemetry: {
        received: this.received,
        packets: this.packets,
        savingPct: this.received === 0 ? 0 : Math.max(0, Math.round((1 - this.packets / this.received) * 100)),
        rateText: RATE_TEXT[mode],
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Crew Training Drill: a scripted, clearly simulated heart-rate stream
// ---------------------------------------------------------------------------

export interface DrillPhase {
  id: 'cruise' | 'drift' | 'acute';
  label: string;
  /** Simulated seconds from the start of the drill. */
  startS: number;
  endS: number;
  /** Simulated seconds per real second. */
  speed: number;
}

export const DRILL_PHASES: DrillPhase[] = [
  { id: 'cruise', label: 'Stable rest', startS: 0, endS: 600, speed: 60 },
  { id: 'drift', label: 'Slow rise in resting heart rate', startS: 600, endS: 2400, speed: 60 },
  { id: 'acute', label: 'Sudden jump at rest (real time)', startS: 2400, endS: 2450, speed: 1 },
];
export const DRILL_END_S = DRILL_PHASES[DRILL_PHASES.length - 1].endS;

export function drillPhaseAt(sec: number): DrillPhase {
  return DRILL_PHASES.find((p) => sec < p.endS) ?? DRILL_PHASES[DRILL_PHASES.length - 1];
}

/** Small, repeatable beat-to-beat variation (no randomness, so every drill is the same). */
const wobble = (sec: number) => 1.2 * Math.sin(sec * 1.7) + 0.8 * Math.sin(sec * 0.37 + 1);

/** Simulated heart rate at a given drill second. */
export function drillBpm(sec: number): number {
  let bpm: number;
  if (sec < 600) bpm = 68;
  else if (sec < 2400) bpm = 68 + ((sec - 600) / 1800) * 26; // +26 bpm over 30 minutes
  else {
    const s = sec - 2400;
    if (s < 5) bpm = 94;
    else if (s < 11) bpm = 94 + ((s - 5) / 6) * 46; // sudden jump to 140 in 6 s
    else if (s < 23) bpm = 140;
    else if (s < 35) bpm = 140 - ((s - 23) / 12) * 44; // recovery to 96
    else bpm = 96;
  }
  return Math.round(bpm + wobble(sec));
}
