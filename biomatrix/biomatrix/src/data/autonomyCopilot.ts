/**
 * BioMatrix Autonomy Copilot: onboard decision support for when Earth is too far away
 * to help in real time.
 *
 * It adds three things on top of the single-value triage in spaceHealthEngine.ts:
 *  1. Linked patterns: connects body signals with habitat and space-weather signals
 *     ("is it me, or is it the cabin air?") and resolves conflicting actions.
 *  2. What happens next: straight-line trends from the astronaut's own check-ins, and
 *     "hidden drift" away from their personal baseline while still inside the normal range.
 *  3. Readiness and protocol: GO / CAUTION / NO-GO for EVA and safety-critical work, and
 *     one ordered list of actions with timers.
 *
 * Same accuracy rules as the rest of the app: every statement carries a source, either a
 * NASA / medical page or the ILLUSTRATIVE tag (a team design choice, not a NASA threshold).
 * Pure functions only, so the logic can be tested without the UI.
 */

import {
  ILLUSTRATIVE,
  METRICS,
  METRIC_ORDER,
  NO_SYMPTOMS,
  SRC,
  evaluateMetric,
  formatMetric,
  type Assessment,
  type DayRecord,
  type Environment,
  type Fact,
  type MetricId,
  type NumericVitalKey,
  type Status,
  type Symptoms,
  type Vitals,
} from './spaceHealthEngine';
import type { Activity, LiveAlarm } from './liveHeartMonitor';

const RANK: Record<Status, number> = { green: 0, yellow: 1, red: 2 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternKind = 'space-weather' | 'acute-heart' | 'oxygen' | 'cabin-air' | 'infection' | 'fluids' | 'fatigue';

/** A live heart-rate alarm from the Live Heart Monitor (real strap or Crew Training Drill). */
export interface LiveCopilotInput {
  alarm: LiveAlarm;
  /** True for the Crew Training Drill: shown with a drill badge, never in the report. */
  drill: boolean;
  activity: Activity;
  /** Device name, or "Crew Training Drill". */
  sourceName: string;
}

export interface CopilotAction {
  /** Stable id, used to remember which steps are done today. */
  id: string;
  text: string;
  source: string;
  /** Minutes to wait before the follow-up (shows a timer). */
  waitMinutes?: number;
  /** The step is about other crew members. */
  crew?: boolean;
  /** The step opens the flight surgeon report. */
  opensReport?: boolean;
}

export interface LinkedPattern {
  id: PatternKind;
  /** One sentence: what is most likely going on. */
  title: string;
  severity: Exclude<Status, 'green'>;
  /** True when the cause can affect every crew member (shared air, radiation, germs). */
  crewWide: boolean;
  /** The signals that were linked, as short labels. */
  evidence: string[];
  /** What was checked and ruled out, e.g. "Cabin CO2 normal: air ruled out". */
  ruledOut: string[];
  /** Why these signals belong together. */
  explanation: Fact;
  actions: CopilotAction[];
  /** Comes from the Crew Training Drill (simulated heart rate), not from real data. */
  drill?: boolean;
}

export type ReadinessVerdict = 'go' | 'caution' | 'no-go';

export interface ReadinessItem {
  text: string;
  /** What has to change for this item to clear. */
  clears: string;
}

export interface Readiness {
  verdict: ReadinessVerdict;
  task: string;
  blockers: ReadinessItem[];
  cautions: ReadinessItem[];
}

export interface TrendForecast {
  metric: MetricId;
  key: NumericVitalKey;
  /** Change per day (in the metric's unit). */
  perDay: number;
  /** Days until the next worse range is reached, if the trend continues. */
  days: number;
  toStatus: Exclude<Status, 'green'>;
  missionDay: number;
  text: string;
}

export interface Drift {
  metric: MetricId;
  key: NumericVitalKey;
  value: number;
  baseline: number;
  text: string;
}

export interface EarthLink {
  /** Round trip in minutes (0 = real time). */
  roundTripMinutes: number;
  /** Earliest time a reply from Earth can arrive if the report is sent now (null = real time). */
  earliestReply: Date | null;
  text: string;
}

export interface CopilotResult {
  patterns: LinkedPattern[];
  /** A note shown when two protocols ask for opposite things and one wins. */
  conflict: Fact | null;
  readiness: Readiness;
  forecasts: TrendForecast[];
  drifts: Drift[];
  /** Number of check-ins the forecast and the baseline were built from. */
  historyCount: number;
  protocol: CopilotAction[];
  earth: EarthLink;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const off = (a: Assessment, id: MetricId) => a.metrics[id].status !== 'green';
const isRed = (a: Assessment, id: MetricId) => a.metrics[id].status === 'red';

/** First letter lower-case, for use after a colon ("High cabin CO2" -> "high cabin CO2"). */
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** "Reaction Time (PVT-style)" -> "Reaction time" (keeps CO2 / SpO2 as they are). */
function shortName(full: string): string {
  return full.replace(/ \(.*\)$/, '').replace(/ ([A-Z])([a-z])/g, (_m, a: string, b: string) => ` ${a.toLowerCase()}${b}`);
}

/** " ppm", " h", but "/10" without a space. */
const unitText = (unit: string) => (!unit ? '' : unit.startsWith('/') ? unit : ` ${unit}`);

/** "Cabin CO2 4200 ppm", "Sleep 5.5 h". */
function label(id: MetricId, v: Vitals): string {
  const m = METRICS[id];
  const short = shortName(m.label);
  const unit = unitText(m.unit);
  return `${short} ${formatMetric(id, v)}${unit}`;
}

const SYMPTOM_SHORT: Record<keyof Symptoms, string> = {
  dizziness: 'Dizziness',
  fainting: 'Fainting',
  blurredVision: 'Blurred vision',
  shortBreath: 'Short of breath',
  irritation: 'Eye or airway irritation',
  headache: 'Headache',
};

// ---------------------------------------------------------------------------
// 1. Linked patterns (body + habitat + space weather)
// ---------------------------------------------------------------------------

const PATTERN_ORDER: PatternKind[] = ['space-weather', 'acute-heart', 'oxygen', 'cabin-air', 'infection', 'fluids', 'fatigue'];

const ACUTE_TITLES: Record<LiveAlarm['kind'], string> = {
  spike: 'Sudden heart-rate jump at rest: treat it as urgent until it is checked.',
  drop: 'Sudden heart-rate drop: stop and watch for fainting.',
  high: 'Heart rate above the safe limit: stop and rest now.',
  low: 'Very slow heart rate: stop and get a crewmate.',
};

/** Live heart-rate alarm -> linked pattern. Drill steps get ids starting with "drill-". */
export function acuteHeartPattern(live: LiveCopilotInput): LinkedPattern {
  const id = (x: string) => (live.drill ? `drill-${x}` : x);
  return {
    id: 'acute-heart',
    title: ACUTE_TITLES[live.alarm.kind],
    severity: 'red',
    crewWide: false,
    drill: live.drill,
    evidence: [
      live.alarm.short,
      `${Math.round(live.alarm.bpm)} bpm now`,
      live.activity === 'rest' ? 'At rest' : 'During exercise',
      `Live: ${live.sourceName}`,
    ],
    ruledOut: ['Single-reading glitch (confirmed by 3 readings)'],
    explanation: METRICS.heartRate.why,
    actions: [
      { id: id('hr-stop'), text: 'Stop what you are doing, sit or lie down, and stay still.', source: ILLUSTRATIVE },
      { id: id('hr-buddy'), text: 'Call a crewmate to stay with you.', source: ILLUSTRATIVE, crew: true },
      { id: id('hr-measure'), text: 'Take a blood-pressure and SpO2 reading now and enter them.', source: ILLUSTRATIVE },
      {
        id: id('hr-recheck'),
        text: 'If your heart rate is not back below 100 bpm after 5 minutes of rest, call the Crew Medical Officer.',
        source: ILLUSTRATIVE,
        waitMinutes: 5,
      },
    ],
  };
}

export function findLinkedPatterns(a: Assessment, v: Vitals, s: Symptoms, env: Environment): LinkedPattern[] {
  const out: LinkedPattern[] = [];
  const co2High = off(a, 'cabinCo2');

  // Solar storm: radiation protection comes first for the whole crew.
  if (v.spe) {
    const beyond = env.speStatus === 'red';
    const evidence = ['Solar particle event in progress', env.magnetosphere.text.replace(/\.$/, '')];
    if (off(a, 'radiationDose')) evidence.push(label('radiationDose', v));
    out.push({
      id: 'space-weather',
      title: beyond
        ? 'Solar storm outside Earth’s magnetic field: radiation protection comes first.'
        : 'Solar storm in progress: stay inside and postpone work outside.',
      severity: beyond ? 'red' : 'yellow',
      crewWide: true,
      evidence,
      ruledOut: [],
      explanation: {
        text: 'During a solar particle event, Orion crews build a dense shelter from stowage bags, and NASA can recommend postponing activities outside the station when radiation rises.',
        source: SRC.radiationMoon,
      },
      actions: [
        { id: 'spe-shelter', text: 'Stop EVA or surface work and move to the best-shielded area now.', source: SRC.radiationMoon },
        { id: 'spe-crew', text: 'Make sure every crewmate is in the shelter.', source: ILLUSTRATIVE, crew: true },
        {
          id: 'spe-mass',
          text: 'Add shielding around your rest area with stowage, food and water bags.',
          source: SRC.radiationMoon,
        },
        { id: 'spe-dose', text: 'Read your dosimeter and log it again in 60 minutes.', source: ILLUSTRATIVE, waitMinutes: 60 },
      ],
    });
  }

  // Low oxygen together with breathing changes.
  if (off(a, 'spo2') && (s.shortBreath || off(a, 'respRate'))) {
    const evidence = [label('spo2', v)];
    if (off(a, 'respRate')) evidence.push(label('respRate', v));
    if (s.shortBreath) evidence.push(SYMPTOM_SHORT.shortBreath);
    if (co2High) evidence.push(label('cabinCo2', v));
    out.push({
      id: 'oxygen',
      title: co2High
        ? 'Low oxygen, breathing changes and high CO2: the cabin air system is the first suspect.'
        : 'Low oxygen with breathing changes: check yourself and the air supply now.',
      severity: isRed(a, 'spo2') ? 'red' : 'yellow',
      crewWide: co2High,
      evidence,
      ruledOut: co2High ? [] : ['Cabin CO2 normal'],
      explanation: METRICS.spo2.why,
      actions: [
        { id: 'o2-buddy', text: 'Tell a crewmate now and do not stay alone.', source: ILLUSTRATIVE, crew: true },
        { id: 'o2-air', text: 'Check the cabin oxygen and CO2 readings (or your suit supply).', source: ILLUSTRATIVE },
        { id: 'o2-retest', text: 'Sit still and re-measure SpO2 on another finger in 5 minutes.', source: ILLUSTRATIVE, waitMinutes: 5 },
      ],
    });
  }

  // High CO2 plus body signs that CO2 can cause: fix the habitat, warn the crew.
  const co2Signs: string[] = [];
  if (s.headache) co2Signs.push(SYMPTOM_SHORT.headache);
  if (off(a, 'reactionTime')) co2Signs.push(label('reactionTime', v));
  if (off(a, 'respRate')) co2Signs.push(label('respRate', v));
  if (off(a, 'mood')) co2Signs.push(label('mood', v));
  if (co2High && co2Signs.length > 0) {
    out.push({
      id: 'cabin-air',
      title: 'Cabin air is the likely common cause: fix the air, not only the symptoms.',
      severity: isRed(a, 'cabinCo2') || isRed(a, 'reactionTime') ? 'red' : 'yellow',
      crewWide: true,
      evidence: [label('cabinCo2', v), ...co2Signs],
      ruledOut: [],
      explanation: {
        text: 'A NASA study of ISS data confirmed a significant link between cabin CO2 levels and reported headaches; congestion appears at slightly lower CO2 levels.',
        source: SRC.co2Headache,
      },
      actions: [
        { id: 'co2-move', text: 'Move to the module with the lowest CO2 reading.', source: ILLUSTRATIVE },
        {
          id: 'co2-crew',
          text: 'Alert the crew: everyone breathes the same air. Ask crewmates about headaches.',
          source: ILLUSTRATIVE,
          crew: true,
        },
        { id: 'co2-scrubber', text: 'Check the CO2 scrubber and the fans where you work and sleep.', source: ILLUSTRATIVE },
        {
          id: 'co2-retest',
          text: 'After 30 minutes in cleaner air, repeat the reaction-time test.',
          source: ILLUSTRATIVE,
          waitMinutes: 30,
        },
      ],
    });
  }

  // Fever with a fast pulse or fast breathing: possible infection, which spreads in a closed habitat.
  if (v.temperature >= 38 && (v.heartRate > 100 || v.respRate > 20 || s.shortBreath)) {
    const evidence = [label('temperature', v)];
    if (v.heartRate > 100) evidence.push(label('heartRate', v));
    if (v.respRate > 20) evidence.push(label('respRate', v));
    if (s.shortBreath) evidence.push(SYMPTOM_SHORT.shortBreath);
    out.push({
      id: 'infection',
      title: 'Fever with a fast pulse or breathing: possible infection.',
      severity: isRed(a, 'temperature') || isRed(a, 'heartRate') || isRed(a, 'respRate') ? 'red' : 'yellow',
      crewWide: true,
      evidence,
      ruledOut: [],
      explanation: {
        text: 'In a closed habitat microbes spread more easily between crew members, and spaceflight can change the immune system.',
        source: SRC.closedEnv,
      },
      actions: [
        { id: 'inf-distance', text: 'Keep away from crewmates where possible.', source: SRC.closedEnv, crew: true },
        { id: 'inf-crew', text: 'Ask crewmates to check their own temperature today.', source: ILLUSTRATIVE, crew: true },
        { id: 'inf-skin', text: 'Check your skin for a new rash or cold sores and report them.', source: SRC.immune },
        {
          id: 'inf-retest',
          text: 'Rest, drink fluids and re-measure your temperature in 60 minutes.',
          source: ILLUSTRATIVE,
          waitMinutes: 60,
        },
      ],
    });
  }

  // Low fluids or low blood pressure together with dizziness or a fast pulse.
  const lowBp = v.systolic < 90 || v.diastolic < 60;
  if ((off(a, 'hydration') || lowBp) && (s.dizziness || s.fainting || v.heartRate > 100)) {
    const evidence: string[] = [];
    if (off(a, 'hydration')) evidence.push(label('hydration', v));
    if (lowBp) evidence.push(`Blood pressure ${formatMetric('bloodPressure', v)} mm Hg (low)`);
    if (v.heartRate > 100) evidence.push(label('heartRate', v));
    if (s.dizziness) evidence.push(SYMPTOM_SHORT.dizziness);
    if (s.fainting) evidence.push(SYMPTOM_SHORT.fainting);
    out.push({
      id: 'fluids',
      title: 'Low fluids or low blood pressure may explain the dizziness or fast pulse.',
      severity: s.fainting || isRed(a, 'hydration') || isRed(a, 'bloodPressure') ? 'red' : 'yellow',
      crewWide: false,
      evidence,
      ruledOut: [],
      explanation: {
        text: 'In space the heart and blood vessels adapt, and low blood pressure can cause fainting.',
        source: SRC.cardio,
      },
      actions: [
        { id: 'fl-sit', text: 'Sit or lie down, keep still, and do not work alone.', source: ILLUSTRATIVE, crew: true },
        { id: 'fl-drink', text: 'Drink water or an electrolyte drink now.', source: ILLUSTRATIVE },
        {
          id: 'fl-retest',
          text: 'Re-measure blood pressure and heart rate in 15 minutes.',
          source: ILLUSTRATIVE,
          waitMinutes: 15,
        },
      ],
    });
  }

  // Short sleep together with slow reactions or low mood.
  if (off(a, 'sleep') && (off(a, 'reactionTime') || off(a, 'mood'))) {
    const slow = off(a, 'reactionTime');
    const evidence = [label('sleep', v)];
    if (slow) evidence.push(label('reactionTime', v));
    if (off(a, 'mood')) evidence.push(label('mood', v));
    const ruledOut: string[] = [];
    if (!co2High) ruledOut.push('Cabin CO2 normal');
    if (v.temperature < 38) ruledOut.push('No fever');
    out.push({
      id: 'fatigue',
      title: slow
        ? 'Fatigue is starting to slow you down: hand over safety-critical work.'
        : 'Short sleep and low mood are feeding each other.',
      severity: isRed(a, 'sleep') || isRed(a, 'reactionTime') || isRed(a, 'mood') ? 'red' : 'yellow',
      crewWide: false,
      evidence,
      ruledOut,
      explanation: slow
        ? {
            text: 'NASA lists inadequate sleep and irregular schedules as a spaceflight risk because they can lower alertness and performance.',
            source: SRC.sleep,
          }
        : {
            text: 'Isolation can cause anxiety and depression, which affect sleep, morale and decision-making.',
            source: SRC.behavioral,
          },
      actions: [
        ...(slow
          ? [
              { id: 'fat-handover', text: 'Hand over safety-critical tasks until you have rested and re-tested.', source: ILLUSTRATIVE },
              { id: 'fat-rest', text: 'Take a 20-minute rest break, then repeat the reaction test.', source: ILLUSTRATIVE, waitMinutes: 20 },
            ]
          : [{ id: 'fat-talk', text: 'Take private time or call family; write in your journal.', source: SRC.behavioral }]),
        {
          id: 'fat-sleep',
          text: 'Protect tonight’s sleep period: follow the lighting schedule and scheduled relaxation.',
          source: SRC.sleep,
        },
      ],
    });
  }

  return out.sort((x, y) => PATTERN_ORDER.indexOf(x.id) - PATTERN_ORDER.indexOf(y.id));
}

/**
 * Two protocols can ask for opposite things. During a solar storm the crew must stay in the
 * shelter, even if the shelter's air is not ideal: the air is fixed in place instead.
 */
function resolveConflicts(patterns: LinkedPattern[]): Fact | null {
  const storm = patterns.find((p) => p.id === 'space-weather' && p.severity === 'red');
  const air = patterns.find((p) => p.id === 'cabin-air');
  if (!storm || !air) return null;
  air.actions = air.actions.map((x) =>
    x.id === 'co2-move'
      ? {
          id: 'co2-in-shelter',
          text: 'Stay in the radiation shelter: increase air flow and CO2 scrubbing there instead of moving to another module.',
          source: ILLUSTRATIVE,
        }
      : x,
  );
  return {
    text: 'Conflict resolved: the radiation shelter and the clean-air step point to different places. Shelter wins; the air is fixed inside the shelter.',
    source: ILLUSTRATIVE,
  };
}

// ---------------------------------------------------------------------------
// 2. Readiness for EVA and safety-critical work
// ---------------------------------------------------------------------------

export function assessReadiness(
  a: Assessment,
  v: Vitals,
  s: Symptoms,
  env: Environment,
  live?: LiveCopilotInput | null,
): Readiness {
  const blockers: ReadinessItem[] = [];
  const cautions: ReadinessItem[] = [];
  const m = a.metrics;

  // A real live alarm blocks EVA; a training drill never changes the real readiness.
  if (live && !live.drill) {
    blockers.push({ text: `Live heart-rate alarm (${live.alarm.short})`, clears: 'Heart rate stable at rest and checked by the CMO' });
  }

  if (v.spe) blockers.push({ text: 'Solar particle event in progress', clears: 'Space-weather all-clear' });
  if (s.fainting) blockers.push({ text: 'Fainting reported', clears: 'Medical clearance' });
  if (s.dizziness) blockers.push({ text: 'Dizziness reported', clears: 'Symptom gone and re-check normal' });
  if (s.shortBreath) blockers.push({ text: 'Short of breath', clears: 'Breathing normal at rest' });
  if (v.temperature >= 38) blockers.push({ text: `Fever ${v.temperature.toFixed(1)} °C`, clears: 'Temperature below 38 °C' });
  if (v.vision === 'severe') blockers.push({ text: 'Severe vision change', clears: 'Medical clearance' });
  const noGoReds: MetricId[] = ['reactionTime', 'sleep', 'spo2', 'heartRate', 'bloodPressure'];
  const clearsText: Partial<Record<MetricId, string>> = {
    reactionTime: 'Reaction test below 350 ms after rest',
    sleep: 'A full sleep period',
    spo2: 'SpO2 above 94%',
    heartRate: 'Resting heart rate 60–100 bpm',
    bloodPressure: 'Blood pressure back in range',
    hydration: `At least ${env.hydrationGreenAt.toFixed(1)} L of fluids today`,
    cabinCo2: 'Cabin CO2 below 2500 ppm',
    mood: 'Talk with the crew or support team',
  };
  for (const id of noGoReds) {
    if (m[id].status === 'red') blockers.push({ text: `${label(id, v)}: ${lowerFirst(m[id].note)}`, clears: clearsText[id]! });
    else if (m[id].status === 'yellow') cautions.push({ text: `${label(id, v)}: ${lowerFirst(m[id].note)}`, clears: clearsText[id]! });
  }
  for (const id of ['hydration', 'cabinCo2', 'mood'] as MetricId[]) {
    if (m[id].status !== 'green') cautions.push({ text: `${label(id, v)}: ${lowerFirst(m[id].note)}`, clears: clearsText[id]! });
  }
  if (s.headache) cautions.push({ text: 'Headache', clears: 'Headache gone' });
  if (v.vision === 'mild' || s.blurredVision) cautions.push({ text: 'Blurred vision', clears: 'Vision check normal' });

  return {
    verdict: blockers.length > 0 ? 'no-go' : cautions.length > 0 ? 'caution' : 'go',
    task: env.id === 'rover' ? 'EVA, rover driving and safety-critical tasks' : 'EVA and safety-critical tasks',
    blockers,
    cautions,
  };
}

export const READINESS_SOURCE: Fact = {
  text: 'The GO / CAUTION / NO-GO rules are a team design based on the indicators in this app.',
  source: ILLUSTRATIVE,
};

// ---------------------------------------------------------------------------
// 3. What happens next: trends and personal baseline
// ---------------------------------------------------------------------------

/** Which direction is worse for each indicator, and the smallest change that counts as drift. */
const DRIFT_RULES: Partial<Record<NumericVitalKey, { worse: 1 | -1; minDelta: number }>> = {
  heartRate: { worse: 1, minDelta: 10 },
  systolic: { worse: 1, minDelta: 12 },
  diastolic: { worse: 1, minDelta: 8 },
  spo2: { worse: -1, minDelta: 2 },
  respRate: { worse: 1, minDelta: 4 },
  cabinCo2: { worse: 1, minDelta: 700 },
  glucose: { worse: 1, minDelta: 15 },
  hydration: { worse: -1, minDelta: 0.6 },
  temperature: { worse: 1, minDelta: 0.6 },
  sleep: { worse: -1, minDelta: 1.5 },
  mood: { worse: -1, minDelta: 2 },
  reactionTime: { worse: 1, minDelta: 60 },
  exercise: { worse: -1, minDelta: 30 },
};

export const FORECAST_SOURCE: Fact = {
  text: 'Straight-line trend and personal-baseline rules are a team design, not a medical prediction.',
  source: ILLUSTRATIVE,
};

/** Least-squares slope and fit (r²) of y over x. */
export function linearFit(xs: number[], ys: number[]): { slope: number; r2: number } {
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
  if (sxx === 0) return { slope: 0, r2: 0 };
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, r2 };
}

const fmt = (key: NumericVitalKey, x: number) => {
  const abs = Math.abs(x);
  if (key === 'hydration' || key === 'temperature' || key === 'sleep') return abs.toFixed(1);
  return abs >= 10 ? String(Math.round(abs)) : abs.toFixed(1).replace(/\.0$/, '');
};

/**
 * If the recent trend continues, when does each indicator enter a worse range?
 * Uses today's value plus up to 6 previous check-ins (needs at least 3 points on 3 different days),
 * and only reports trends with a reasonably straight line (r² ≥ 0.5).
 */
export function forecastTrends(
  history: DayRecord[],
  today: Vitals,
  todayDay: number,
  env: Environment,
  current?: Assessment,
): TrendForecast[] {
  const past = history.filter((h) => h.day < todayDay).slice(-6);
  if (past.length < 2) return [];
  const days = [...past.map((h) => h.day), todayDay];
  const ctx = { symptoms: NO_SYMPTOMS, env, recentSleep: [] as number[] };
  const out: TrendForecast[] = [];

  for (const id of METRIC_ORDER) {
    const fields = METRICS[id].fields;
    if (fields.length === 0) continue;
    const fits = fields.map((f) => ({ f, ...linearFit(days, [...past.map((h) => h[f.key]), today[f.key]]) }));
    // Compare like with like (no symptoms), but never forecast a metric that is already red today.
    const now = evaluateMetric(id, today, ctx).status;
    if (now === 'red' || current?.metrics[id].status === 'red') continue;
    const horizon = id === 'radiationDose' ? 365 : 14;
    for (let d = 1; d <= horizon; d++) {
      const projected: Vitals = { ...today };
      for (const { f, slope, r2 } of fits) {
        if (r2 < 0.5) continue;
        projected[f.key] = Math.min(f.max, Math.max(f.min, today[f.key] + slope * d));
      }
      const status = evaluateMetric(id, projected, ctx).status;
      if (RANK[status] > RANK[now]) {
        // The field that moved the most (relative to its slider range) drives the message.
        const main = fits
          .filter((x) => x.r2 >= 0.5)
          .sort((x, y) => Math.abs(y.slope) / (y.f.max - y.f.min) - Math.abs(x.slope) / (x.f.max - x.f.min))[0];
        const range = status === 'red' ? 'critical (red)' : 'caution (yellow)';
        const unit = unitText(METRICS[id].unit);
        const per = `${fmt(main.f.key, main.slope)}${unit} per day`;
        const name = shortName(METRICS[id].label);
        out.push({
          metric: id,
          key: main.f.key,
          perDay: main.slope,
          days: d,
          toStatus: status as Exclude<Status, 'green'>,
          missionDay: todayDay + d,
          text: `${name} is ${main.slope > 0 ? 'rising' : 'falling'} about ${per}. If this continues, it reaches the ${range} range in about ${d} day${d === 1 ? '' : 's'} (mission day ${todayDay + d}).`,
        });
        break;
      }
    }
  }
  return out.sort((x, y) => x.days - y.days).slice(0, 4);
}

/**
 * Hidden drift: today's value is still in the normal (green) range but clearly unusual
 * for this astronaut (outside 2 standard deviations of their own previous check-ins
 * and at least a minimum change in the worse direction). Needs 3 previous check-ins.
 */
export function findDrifts(history: DayRecord[], today: Vitals, a: Assessment): Drift[] {
  const past = history.slice(-14);
  if (past.length < 3) return [];
  const out: Drift[] = [];
  for (const id of METRIC_ORDER) {
    if (a.metrics[id].status !== 'green') continue;
    for (const f of METRICS[id].fields) {
      const rule = DRIFT_RULES[f.key];
      if (!rule) continue;
      const values = past.map((h) => h[f.key]);
      const mean = values.reduce((x, y) => x + y, 0) / values.length;
      const sd = Math.sqrt(values.reduce((x, y) => x + (y - mean) ** 2, 0) / (values.length - 1));
      const delta = (today[f.key] - mean) * rule.worse;
      if (delta >= rule.minDelta && delta >= 2 * sd) {
        const unit = unitText(METRICS[id].unit);
        const name = f.label === METRICS[id].label ? METRICS[id].label : f.label;
        const short = shortName(name);
        out.push({
          metric: id,
          key: f.key,
          value: today[f.key],
          baseline: mean,
          text: `${short} ${fmt(f.key, today[f.key])}${unit} is ${today[f.key] > mean ? 'above' : 'below'} your usual ${fmt(f.key, mean)}${unit}. Still in the normal range, but unusual for you.`,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Earth link and the combined protocol
// ---------------------------------------------------------------------------

export function earthLink(env: Environment, now: Date): EarthLink {
  const roundTripMinutes = (env.commDelaySeconds * 2) / 60;
  if (env.commDelaySeconds >= 60) {
    const earliestReply = new Date(now.getTime() + env.commDelaySeconds * 2 * 1000);
    const at = earliestReply.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      roundTripMinutes,
      earliestReply,
      text: `If you transmit now, the earliest reply from Earth arrives at ${at} (${Math.round(roundTripMinutes)}+ min round trip). Do not wait: the steps below start now.`,
    };
  }
  if (env.id === 'rover') {
    return { roundTripMinutes, earliestReply: null, text: 'Earth is a few seconds away, but the rover link may drop out: follow the steps without waiting.' };
  }
  return {
    roundTripMinutes,
    earliestReply: null,
    text: env.commDelaySeconds > 0 ? 'Earth answers within a few seconds.' : 'Flight surgeons can answer in real time.',
  };
}

/**
 * One ordered list of actions: linked-pattern steps first (most urgent pattern first),
 * then the readiness hand-over, then the people to contact. No duplicates, at most 8 steps.
 */
export function buildProtocol(a: Assessment, patterns: LinkedPattern[], readiness: Readiness, env: Environment): CopilotAction[] {
  const out: CopilotAction[] = [];
  const seen = new Set<string>();
  const add = (x: CopilotAction) => {
    if (!seen.has(x.id) && !seen.has(x.text)) {
      seen.add(x.id);
      seen.add(x.text);
      out.push(x);
    }
  };
  const ordered = [...patterns].sort((x, y) => RANK[y.severity] - RANK[x.severity] || PATTERN_ORDER.indexOf(x.id) - PATTERN_ORDER.indexOf(y.id));
  // Radiation shelter is always first: it is the only step that cannot wait.
  const storm = ordered.find((p) => p.id === 'space-weather');
  if (storm) storm.actions.slice(0, 1).forEach(add);
  for (const p of ordered) p.actions.slice(0, 2).forEach(add);

  if (readiness.verdict === 'no-go' && !seen.has('fat-handover')) {
    add({ id: 'ready-handover', text: `NO-GO: do not start ${readiness.task.toLowerCase()}; hand them over to a crewmate.`, source: ILLUSTRATIVE });
  }
  if (a.triage.level >= 2) {
    add({ id: 'cmo', text: 'Ask the Crew Medical Officer to review your readings.', source: ILLUSTRATIVE, crew: true });
  }
  if (a.triage.level === 3) {
    add({
      id: 'transmit',
      text: env.autonomousTriage
        ? 'Transmit the flight surgeon report to Earth (it is queued; do not wait for the answer).'
        : 'Send the flight surgeon report to Earth now.',
      source: ILLUSTRATIVE,
      opensReport: true,
    });
  }
  // The remaining follow-up steps (timers) of each pattern.
  for (const p of ordered) p.actions.slice(2).forEach(add);
  if (out.length === 0 && a.triage.level > 0) {
    a.triage.actions.slice(0, 3).forEach((f, i) => add({ id: `triage-${i}`, text: f.text, source: f.source }));
  }
  return out.slice(0, 8);
}

/** Runs the whole copilot. `history` = previous check-ins, oldest first, NOT including today. */
export function runCopilot(
  a: Assessment,
  v: Vitals,
  s: Symptoms,
  env: Environment,
  history: DayRecord[],
  missionDay: number,
  now: Date,
  live?: LiveCopilotInput | null,
): CopilotResult {
  const patterns = findLinkedPatterns(a, v, s, env);
  if (live) {
    patterns.push(acuteHeartPattern(live));
    patterns.sort((x, y) => PATTERN_ORDER.indexOf(x.id) - PATTERN_ORDER.indexOf(y.id));
  }
  const conflict = resolveConflicts(patterns);
  const readiness = assessReadiness(a, v, s, env, live);
  return {
    patterns,
    conflict,
    readiness,
    forecasts: forecastTrends(history, v, missionDay, env, a),
    drifts: findDrifts(history, v, a),
    historyCount: history.length,
    protocol: buildProtocol(a, patterns, readiness, env),
    earth: earthLink(env, now),
  };
}
