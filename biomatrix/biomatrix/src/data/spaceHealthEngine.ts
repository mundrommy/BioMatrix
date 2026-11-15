/**
 * BioMatrix - space health data & autonomous triage engine.
 *
 * SCIENTIFIC ACCURACY RULES used in this file:
 *  - Every threshold, fact and countermeasure carries a `source`.
 *  - A source is either a URL listed in SRC (NASA / CSA / medical reference)
 *    or ILLUSTRATIVE (an empty source: no external reference, no tag shown).
 *  - Nothing is attributed to NASA or CSA unless it comes from those pages.
 *
 * This is a hackathon prototype. It gives guidance, not a medical diagnosis.
 */

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Facts without an external source: shown with no source tag. */
export const ILLUSTRATIVE = '';

export const DISCLAIMER =
  'Guidance only, not a medical diagnosis. The flight surgeon makes medical decisions.';

export const SRC = {
  hazards: 'https://www.nasa.gov/hrp/hazards/',
  distance: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
  gravity: 'https://www.nasa.gov/hrp/hazard-gravity-fields/',
  isolation: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/',
  closedEnv: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/',
  radiationHazard: 'https://www.nasa.gov/hrp/hazard-space-radiation/',
  research: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
  sans: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/',
  bone: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/',
  cardio: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/',
  immune: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/',
  sensorimotor: 'https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/',
  sleep: 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/',
  behavioral: 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/',
  radiationCancer: 'https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/',
  csaRadiation:
    'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
  aha: 'https://heart.org/bplevels',
  mayoHeartRate: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/expert-answers/heart-rate/faq-20057979',
  mayoLowBp: 'https://www.mayoclinic.org/diseases-conditions/hypotension/symptoms-causes/syc-20355465',
  medlineGlucose: 'https://medlineplus.gov/ency/article/003482.htm',
  merckFever: 'https://merckmanuals.com/home/infections/biology-of-infectious-disease/fever-in-adults',
  cdcSleep: 'https://www.cdc.gov/mmwr/volumes/65/wr/mm6506a1.htm',
  co2Headache: 'https://ntrs.nasa.gov/citations/20160012725',
  nasaCo2: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf',
  nasaRadLimit: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
  mayoHypoxemia: 'https://www.mayoclinic.org/symptoms/hypoxemia/basics/causes/sym-20050930',
  lungResp: 'https://www.lung.org/blog/respiratory-rate-vital-signs',
  cdcHypo: 'https://www.cdc.gov/diabetes/treatment/treatment-low-blood-sugar-hypoglycemia.html',
  mayoWater: 'https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/water/art-20044256',
  pvt: 'https://www.psytoolkit.org/experiment-library/pvtb.html',
  csaExercise: 'https://asc-csa.gc.ca/eng/astronauts/living-exercising.asp',
  radiationMoon:
    'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon',
} as const;

/** Human-readable names for every source URL (used by the UI and the Sources list). */
export const SOURCE_LABELS: Record<string, string> = {
  [SRC.hazards]: 'NASA HRP: 5 Hazards of Human Spaceflight',
  [SRC.distance]: 'NASA HRP: Hazard - Distance from Earth',
  [SRC.gravity]: 'NASA HRP: Hazard - Gravity Fields',
  [SRC.isolation]: 'NASA HRP: Hazard - Isolation and Confinement',
  [SRC.closedEnv]: 'NASA HRP: Hazard - Hostile/Closed Environments',
  [SRC.radiationHazard]: 'NASA HRP: Hazard - Space Radiation',
  [SRC.research]: 'NASA HRP: Ongoing HRP Research in Space',
  [SRC.sans]: 'NASA: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)',
  [SRC.bone]: 'NASA: Risk of Spaceflight-Induced Bone Changes',
  [SRC.cardio]: 'NASA: Risk of Cardiovascular Adaptations',
  [SRC.immune]: 'NASA: Risk of Altered Immune System Responses',
  [SRC.sensorimotor]: 'NASA: Risk of Altered Sensorimotor and Vestibular Function',
  [SRC.sleep]: 'NASA: Risk from Inadequate Sleep and Irregular Schedules',
  [SRC.behavioral]: 'NASA: Risk of Behavioral Conditions and Psychiatric Disorders',
  [SRC.radiationCancer]: 'NASA: Risk of Radiation-Induced Cancers',
  [SRC.csaRadiation]: 'CSA: Monitoring Radiation for Astronaut Health',
  [SRC.aha]: 'American Heart Association: Blood pressure readings',
  [SRC.mayoHeartRate]: 'Mayo Clinic: Normal resting heart rate',
  [SRC.mayoLowBp]: 'Mayo Clinic: Low blood pressure (hypotension)',
  [SRC.medlineGlucose]: 'MedlinePlus: Blood glucose test',
  [SRC.merckFever]: 'Merck Manual: Fever in adults',
  [SRC.cdcSleep]: 'CDC MMWR: Healthy sleep duration among adults',
  [SRC.co2Headache]: 'NASA NTRS: CO2 levels and reported congestion and headaches on the ISS',
  [SRC.nasaCo2]: 'NASA OCHMO: Carbon dioxide technical brief',
  [SRC.nasaRadLimit]: 'NASA OCHMO: Radiation protection technical brief',
  [SRC.mayoHypoxemia]: 'Mayo Clinic: Low blood oxygen (hypoxemia)',
  [SRC.lungResp]: 'American Lung Association: Respiratory rate',
  [SRC.cdcHypo]: 'CDC: Treatment of low blood sugar',
  [SRC.mayoWater]: 'Mayo Clinic: How much water do you need?',
  [SRC.pvt]: 'PsyToolkit: Psychomotor Vigilance Task',
  [SRC.csaExercise]: 'CSA: Physical activity in space',
  [SRC.radiationMoon]: 'NASA Science: How NASA will protect astronauts from space radiation at the Moon',
};

export function isIllustrative(source: string): boolean {
  return !source;
}

export function sourceLabel(source: string): string {
  return isIllustrative(source) ? '' : SOURCE_LABELS[source] ?? source;
}

/** A statement shown to the astronaut, always with where it comes from. */
export interface Fact {
  text: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type Status = 'green' | 'yellow' | 'red';

export type HazardId = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment';

export type ZoneId = 'neuro' | 'cardio' | 'metabolic' | 'musculo' | 'immune';

export type EnvironmentId = 'iss' | 'moon' | 'mars' | 'rover';

export type MetricId =
  | 'bloodPressure'
  | 'heartRate'
  | 'spo2'
  | 'respRate'
  | 'cabinCo2'
  | 'glucose'
  | 'hydration'
  | 'temperature'
  | 'sleep'
  | 'mood'
  | 'reactionTime'
  | 'vision'
  | 'exercise'
  | 'radiationDose'
  | 'spe';

export type VisionCheck = 'normal' | 'mild' | 'severe';

export interface Vitals {
  heartRate: number; // bpm, resting
  systolic: number; // mm Hg
  diastolic: number; // mm Hg
  spo2: number; // %
  respRate: number; // breaths per minute
  cabinCo2: number; // ppm
  glucose: number; // mg/dL, fasting
  hydration: number; // litres of fluid today
  temperature: number; // deg C, oral
  sleep: number; // hours last night
  mood: number; // 1 (very low / very stressed) to 10 (very good)
  reactionTime: number; // ms, PVT-style average
  vision: VisionCheck;
  exercise: number; // minutes of exercise today
  radiationDose: number; // cumulative mission dose, mSv
  spe: boolean; // Solar Particle Event in progress
}

export type NumericVitalKey = Exclude<keyof Vitals, 'vision' | 'spe'>;

export interface Symptoms {
  dizziness: boolean;
  fainting: boolean;
  blurredVision: boolean;
  shortBreath: boolean;
  irritation: boolean; // eye / airway irritation (e.g. dust)
  headache: boolean;
}

export const NO_SYMPTOMS: Symptoms = {
  dizziness: false,
  fainting: false,
  blurredVision: false,
  shortBreath: false,
  irritation: false,
  headache: false,
};

export const SYMPTOM_LABELS: Record<keyof Symptoms, string> = {
  dizziness: 'Dizziness or lightheadedness',
  fainting: 'Fainting',
  blurredVision: 'Blurred vision',
  shortBreath: 'Shortness of breath',
  irritation: 'Eye or airway irritation (dust)',
  headache: 'Headache',
};

/** One day of the 14-day history. */
export type DayRecord = { day: number } & Record<NumericVitalKey, number>;

// ---------------------------------------------------------------------------
// NASA HRP: the 5 hazards of human spaceflight
// ---------------------------------------------------------------------------

export interface Hazard {
  id: HazardId;
  name: string;
  summary: Fact;
}

export const HAZARDS: Record<HazardId, Hazard> = {
  radiation: {
    id: 'radiation',
    name: 'Space Radiation',
    summary: {
      text: 'Radiation raises cancer risk and may affect the heart, blood vessels, eyes and cognition. Moon and Mars crews leave the protection of Earth’s magnetic field.',
      source: SRC.radiationCancer,
    },
  },
  isolation: {
    id: 'isolation',
    name: 'Isolation & Confinement',
    summary: {
      text: 'Isolation can cause anxiety and depression, and affects sleep, morale and decision-making.',
      source: SRC.behavioral,
    },
  },
  distance: {
    id: 'distance',
    name: 'Distance from Earth',
    summary: {
      text: 'A Mars message can take up to 20 minutes one way, so crews must handle medical problems with little help from Earth.',
      source: SRC.distance,
    },
  },
  gravity: {
    id: 'gravity',
    name: 'Gravity Fields',
    summary: {
      text: 'Without gravity, fluids shift toward the head, bones lose 1–1.5% of density per month, and muscles and the heart change. A Mars crew would also spend up to 2 years at about 3/8 of Earth’s gravity.',
      source: SRC.hazards,
    },
  },
  environment: {
    id: 'environment',
    name: 'Hostile/Closed Environments',
    summary: {
      text: 'In a closed habitat microbes spread more easily between crew, stress hormones rise and the immune system can change.',
      source: SRC.closedEnv,
    },
  },
};

// ---------------------------------------------------------------------------
// Mission environments (dynamic risk weighting)
// ---------------------------------------------------------------------------

export interface Environment {
  id: EnvironmentId;
  name: string;
  shortName: string;
  /** Text shown in the header. */
  commDelay: Fact;
  /** One-way delay in seconds, used for the telemetry timer. 0 = near real-time. */
  commDelaySeconds: number;
  /** True when the crew cannot wait for Earth: self-care steps are shown first. */
  autonomousTriage: boolean;
  /** Inside Earth's magnetic field (ISS) or beyond it (Moon, Mars). */
  magnetosphere: Fact;
  /** How many yellow values at once escalate to "Crew Assist". Lower = more sensitive. */
  yellowsForCrewAssist: number;
  /** Status given to an active Solar Particle Event in this environment. */
  speStatus: Status;
  /** Litres of fluid per day needed for a green hydration status. */
  hydrationGreenAt: number;
  note: Fact;
}

export const ENVIRONMENTS: Record<EnvironmentId, Environment> = {
  iss: {
    id: 'iss',
    name: 'ISS LEO Orbit',
    shortName: 'ISS LEO',
    commDelay: { text: 'Near real-time link', source: ILLUSTRATIVE },
    commDelaySeconds: 0,
    autonomousTriage: false,
    magnetosphere: {
      text: 'Inside the protection of Earth’s magnetic field.',
      source: SRC.radiationCancer,
    },
    yellowsForCrewAssist: 3,
    speStatus: 'yellow',
    hydrationGreenAt: 2.2,
    note: {
      text: 'ISS crews can talk with family and medical professionals on the ground.',
      source: SRC.behavioral,
    },
  },
  moon: {
    id: 'moon',
    name: 'Lunar Base (1/6 g + Regolith)',
    shortName: 'Lunar Base',
    commDelay: { text: 'About 1.3 s one-way delay (light travel time)', source: ILLUSTRATIVE },
    commDelaySeconds: 1.3,
    autonomousTriage: false,
    magnetosphere: {
      text: 'Beyond the protection of Earth’s magnetic field.',
      source: SRC.radiationCancer,
    },
    yellowsForCrewAssist: 3,
    speStatus: 'red',
    hydrationGreenAt: 2.3,
    note: {
      text: 'Lunar dust (regolith) may irritate eyes and airways after surface work.',
      source: ILLUSTRATIVE,
    },
  },
  mars: {
    id: 'mars',
    name: 'Mars Transit (Deep Space)',
    shortName: 'Mars Transit',
    commDelay: { text: 'Up to 20 min one-way delay', source: SRC.distance },
    commDelaySeconds: 20 * 60,
    autonomousTriage: true,
    magnetosphere: {
      text: 'Beyond the protection of Earth’s magnetic field.',
      source: SRC.radiationCancer,
    },
    yellowsForCrewAssist: 2,
    speStatus: 'red',
    hydrationGreenAt: 2.2,
    note: {
      text: 'A Mars trip takes about 3 years; crews must handle medical emergencies with little help from Earth.',
      source: SRC.distance,
    },
  },
  rover: {
    id: 'rover',
    name: 'Pressurized Rover (lunar surface)',
    shortName: 'Rover',
    commDelay: { text: 'About 1.3 s one-way delay, link may drop out', source: ILLUSTRATIVE },
    commDelaySeconds: 1.3,
    autonomousTriage: true,
    magnetosphere: {
      text: 'Beyond the protection of Earth’s magnetic field.',
      source: SRC.radiationCancer,
    },
    yellowsForCrewAssist: 2,
    speStatus: 'red',
    hydrationGreenAt: 2.3,
    note: {
      text: 'A small cabin far from base: thinner shielding and limited medical kit, so the app escalates earlier.',
      source: ILLUSTRATIVE,
    },
  },
};

export const ENVIRONMENT_ORDER: EnvironmentId[] = ['iss', 'moon', 'mars', 'rover'];

// ---------------------------------------------------------------------------
// Health indicators
// ---------------------------------------------------------------------------

export interface SliderField {
  key: NumericVitalKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface MetricDef {
  id: MetricId;
  label: string;
  unit: string;
  zone: ZoneId;
  hazards: HazardId[];
  /** Human-readable reference ranges. */
  ranges: { green: string; yellow: string; red: string };
  /** Where the ranges come from. */
  source: string;
  /** Extra sources for parts of the ranges. */
  moreSources?: string[];
  /** Explains which parts of the ranges are sourced and which are team design. */
  thresholdNote?: string;
  /** "Why this matters in space". */
  why: Fact;
  /** Step-by-step self-exam guide. Assume the astronaut needs guidance. */
  howToMeasure: string[];
  countermeasures: { yellow: Fact[]; red: Fact[] };
  /** Sliders used to enter the value (empty for the vision check and SPE toggle). */
  fields: SliderField[];
}

const ESCALATE_RED: Fact = {
  text: 'Send the reading to the flight surgeon and follow their instructions.',
  source: ILLUSTRATIVE,
};

export const METRICS: Record<MetricId, MetricDef> = {
  bloodPressure: {
    id: 'bloodPressure',
    label: 'Blood Pressure',
    unit: 'mm Hg',
    zone: 'cardio',
    hazards: ['gravity', 'distance'],
    ranges: {
      green: 'Below 120 / below 80',
      yellow: '120–139 systolic or 80–89 diastolic; or below 90/60 without symptoms',
      red: '140+ systolic or 90+ diastolic; above 180/120 is a crisis; below 90/60 with dizziness, fainting or blurred vision',
    },
    source: SRC.aha,
    moreSources: [SRC.mayoLowBp],
    thresholdNote:
      'High ranges: American Heart Association. Low reading (below 90/60): Mayo Clinic.',
    why: {
      text: 'In space the heart and blood vessels adapt: there is a risk of clots, arrhythmia and low blood pressure, which can cause fainting at landing.',
      source: SRC.cardio,
    },
    howToMeasure: [
      'Sit still and rest for 5 minutes. Do not talk during the reading.',
      'Wrap the automatic cuff around your bare upper arm, level with your heart.',
      'Press start and keep your arm relaxed until the cuff deflates.',
      'Enter the top number (systolic) and the bottom number (diastolic).',
      'If the reading is above 180/120, wait 5 minutes and measure again.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Keep up regular exercise and a healthy diet.', source: SRC.cardio },
        { text: 'Rest 5 minutes and re-measure; check again in a few hours.', source: ILLUSTRATIVE },
        {
          text: 'If the reading is low: drink fluids, and wear lower-body compression garments before landing or a gravity change.',
          source: SRC.cardio,
        },
      ],
      red: [
        {
          text: 'If the reading is above 180/120, wait 5 minutes and re-test; if it is still that high, treat it as an emergency.',
          source: SRC.aha,
        },
        { text: 'An ultrasound scan can check how the heart and vessels are working.', source: SRC.cardio },
        ESCALATE_RED,
      ],
    },
    fields: [
      { key: 'systolic', label: 'Systolic', min: 70, max: 200, step: 1 },
      { key: 'diastolic', label: 'Diastolic', min: 40, max: 130, step: 1 },
    ],
  },

  heartRate: {
    id: 'heartRate',
    label: 'Heart Rate (resting)',
    unit: 'bpm',
    zone: 'cardio',
    hazards: ['gravity'],
    ranges: {
      green: '60–100',
      yellow: '50–59 or 101–120',
      red: 'Below 50 or above 120; or any value with fainting, dizziness or shortness of breath',
    },
    source: SRC.mayoHeartRate,
    thresholdNote:
      'Normal resting range of 60–100 bpm and the warning symptoms: Mayo Clinic.',
    why: {
      text: 'Weightlessness changes the heart: NASA lists arrhythmia among the cardiovascular risks, and the heart becomes more spherical.',
      source: SRC.cardio,
    },
    howToMeasure: [
      'Measure when you are calm and still, ideally right after waking up.',
      'Place two fingers on the inside of your wrist, below the thumb.',
      'Count the beats for 15 seconds and multiply by 4.',
      'Or read the value from your wearable monitor.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Rest for 10 minutes and measure again.', source: ILLUSTRATIVE },
        { text: 'Keep up regular exercise and a healthy diet.', source: SRC.cardio },
      ],
      red: [
        { text: 'Stop activity, rest, and have a crewmate stay with you.', source: ILLUSTRATIVE },
        { text: 'An ultrasound scan can check how the heart is working.', source: SRC.cardio },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'heartRate', label: 'Heart rate', min: 35, max: 180, step: 1 }],
  },

  spo2: {
    id: 'spo2',
    label: 'Blood Oxygen (SpO2)',
    unit: '%',
    zone: 'cardio',
    hazards: ['environment'],
    ranges: { green: '95–100', yellow: '91–94', red: '90 or below' },
    source: SRC.mayoHypoxemia,
    why: {
      text: 'Cabin air and suit pressure are controlled by life support; a falling oxygen level is an early sign that something is wrong with you or the cabin.',
      source: ILLUSTRATIVE,
    },
    howToMeasure: [
      'Warm your hand and sit still.',
      'Clip the pulse oximeter on a fingertip (no gloves).',
      'Wait about 30 seconds until the number is steady, then record it.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Re-measure on another finger; check the cabin CO2 reading.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Tell a crewmate now and check the cabin air system.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'spo2', label: 'SpO2', min: 80, max: 100, step: 1 }],
  },

  respRate: {
    id: 'respRate',
    label: 'Respiratory Rate',
    unit: 'breaths/min',
    zone: 'cardio',
    hazards: ['environment'],
    ranges: { green: '12–20', yellow: '9–11 or 21–24', red: 'Below 9 or above 24' },
    source: SRC.lungResp,
    why: {
      text: 'Faster breathing at rest can point to poor cabin air, dust irritation, fever or stress.',
      source: ILLUSTRATIVE,
    },
    howToMeasure: [
      'Sit still for 2 minutes.',
      'Count how many times your chest rises in 30 seconds and multiply by 2.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Rest and re-count in 10 minutes; check the cabin CO2 reading.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Tell a crewmate now and check SpO2 and cabin air.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'respRate', label: 'Respiratory rate', min: 6, max: 35, step: 1 }],
  },

  cabinCo2: {
    id: 'cabinCo2',
    label: 'Cabin CO2',
    unit: 'ppm',
    zone: 'cardio',
    hazards: ['environment'],
    ranges: { green: 'Below 2500', yellow: '2500–3999', red: '4000 or above' },
    source: SRC.nasaCo2,
    why: {
      text: 'A sealed cabin collects the CO2 the crew breathes out. High CO2 may cause headaches and slower thinking.',
      source: ILLUSTRATIVE,
    },
    howToMeasure: [
      'Read the CO2 value from the cabin air monitor nearest to you.',
      'Note whether you have a headache or feel foggy.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Check the CO2 scrubber and improve air flow where you work and sleep.', source: ILLUSTRATIVE },
        { text: 'Repeat the reaction-time test to see if your alertness is affected.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Move to a module with cleaner air and alert the crew to service the CO2 scrubber.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'cabinCo2', label: 'Cabin CO2', min: 400, max: 6000, step: 50 }],
  },

  glucose: {
    id: 'glucose',
    label: 'Blood Glucose (fasting)',
    unit: 'mg/dL',
    zone: 'metabolic',
    hazards: ['environment', 'distance'],
    ranges: { green: '70–99', yellow: '100–125, or below 70', red: '126+ on a repeated test' },
    source: SRC.medlineGlucose,
    thresholdNote: 'Fasting ranges: MedlinePlus (99 or lower is normal, 100–125 prediabetes range, 126+ diabetes range).',
    why: {
      text: 'Food on long missions is limited and stored for a long time. Tracking fasting blood sugar shows how your body is handling the mission diet.',
      source: ILLUSTRATIVE,
    },
    howToMeasure: [
      'Measure before breakfast, after at least 8 hours without food.',
      'Wash and dry your hands. Insert a test strip into the glucometer.',
      'Prick the side of a fingertip with the lancet and touch the drop of blood to the strip.',
      'Record the number in mg/dL. Dispose of the lancet in the sharps container.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Eat the planned meals and re-test tomorrow before breakfast.', source: ILLUSTRATIVE },
        { text: 'If the value is below 70, eat or drink something with sugar and re-test in 15 minutes.', source: SRC.cdcHypo },
      ],
      red: [
        { text: 'Repeat the fasting test tomorrow to confirm the reading.', source: SRC.medlineGlucose },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'glucose', label: 'Fasting glucose', min: 40, max: 250, step: 1 }],
  },

  hydration: {
    id: 'hydration',
    label: 'Daily Hydration',
    unit: 'L',
    zone: 'metabolic',
    hazards: ['gravity'],
    ranges: { green: '2.2 L or more', yellow: '1.2–2.1 L', red: 'Below 1.2 L' },
    source: SRC.mayoWater,
    thresholdNote: 'National Academies: about 2.7 L (women) to 3.7 L (men) of fluids a day, about 20% of it from food. On the lunar surface and in the rover the green target is 2.3 L.',
    why: {
      text: 'Bones release calcium in weightlessness. Together with dehydration, this raises the risk of kidney stones.',
      source: SRC.gravity,
    },
    howToMeasure: [
      'Add up all drink bags and water you have finished today.',
      'Check your urine colour: dark yellow means you need to drink more.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Drink water now and spread drinks through the rest of the day.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Drink water now; tell the crew if you have back or side pain (possible kidney stone).', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'hydration', label: 'Fluids today', min: 0.5, max: 4, step: 0.1 }],
  },

  temperature: {
    id: 'temperature',
    label: 'Body Temperature',
    unit: '°C',
    zone: 'metabolic',
    hazards: ['environment', 'radiation'],
    ranges: { green: '36.0–37.9', yellow: '38.0–39.9 (fever), or 35.0–35.9', red: '40.0 or above, or below 35.0' },
    source: SRC.merckFever,
    thresholdNote: 'Fever above 38 °C and warning signs above 40 °C / below 35 °C: Merck Manual.',
    why: {
      text: 'Radiation, microgravity and poor sleep can change the immune system. ISS astronauts have reported cold sores, rashes, atypical allergies and infections.',
      source: SRC.immune,
    },
    howToMeasure: [
      'Wait 15 minutes after eating or drinking.',
      'Place the thermometer under your tongue and close your mouth.',
      'Wait for the beep and record the value in °C.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Rest, drink fluids and re-measure in a few hours.', source: ILLUSTRATIVE },
        { text: 'Check your skin for a new rash or cold sores and report them.', source: SRC.immune },
      ],
      red: [
        { text: 'Keep away from crewmates where possible: microbes spread more easily in a closed habitat.', source: SRC.closedEnv },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'temperature', label: 'Temperature', min: 34, max: 41.5, step: 0.1 }],
  },

  sleep: {
    id: 'sleep',
    label: 'Sleep (last night)',
    unit: 'h',
    zone: 'neuro',
    hazards: ['isolation'],
    ranges: { green: '7 or more', yellow: '5–6.9', red: 'Below 5, or below 7 for 3 nights in a row' },
    source: SRC.cdcSleep,
    thresholdNote: '7 or more hours for adults: CDC / AASM.',
    why: {
      text: 'The ISS sees about 16 sunrises a day, which disrupts the body clock and sleep.',
      source: SRC.sleep,
    },
    howToMeasure: [
      'Read last night’s sleep time from your wrist-worn activity monitor.',
      'No monitor? Estimate from the time you fell asleep to the time you woke up, minus time awake.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Follow the LED lighting schedule that mimics day and night, and keep the scheduled rest time.', source: SRC.sleep },
        { text: 'Use light therapy to keep your body clock aligned.', source: SRC.isolation },
      ],
      red: [
        { text: 'Protect tonight’s sleep period: follow the lighting schedule and scheduled relaxation.', source: SRC.sleep },
        { text: 'Hand over safety-critical tasks until you have rested.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'sleep', label: 'Sleep', min: 0, max: 12, step: 0.1 }],
  },

  mood: {
    id: 'mood',
    label: 'Mood / Stress Score',
    unit: '/10',
    zone: 'neuro',
    hazards: ['isolation'],
    ranges: { green: '7–10 (good)', yellow: '4–6', red: '1–3 (very low or very stressed)' },
    source: ILLUSTRATIVE,
    why: {
      text: 'Isolation can cause anxiety and depression, which affect sleep, morale and decision-making.',
      source: SRC.behavioral,
    },
    howToMeasure: [
      'Take a quiet moment and rate how you feel overall today.',
      '10 = calm and positive, 1 = very low or very stressed.',
      'Be honest: the score is for your own care.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Write in your journal: NASA scientists use journaling to assess mental state.', source: SRC.isolation },
        { text: 'Call family, tend plants, and take window time or private time.', source: SRC.behavioral },
      ],
      red: [
        { text: 'Talk to a crewmate you trust today, and contact family.', source: SRC.behavioral },
        { text: 'Ask for a private session with psychological support on the ground.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'mood', label: 'Mood', min: 1, max: 10, step: 1 }],
  },

  reactionTime: {
    id: 'reactionTime',
    label: 'Reaction Time (PVT-style)',
    unit: 'ms',
    zone: 'neuro',
    hazards: ['isolation', 'environment'],
    ranges: { green: 'Below 350', yellow: '350–499', red: '500 or above' },
    source: SRC.pvt,
    why: {
      text: 'A slower reaction time is an early sign of fatigue. Poor sleep and stale cabin air can both slow you down.',
      source: ILLUSTRATIVE,
    },
    howToMeasure: [
      'Open the 15-second reaction test in the vitals panel.',
      'Click the target as fast as you can each time it lights up.',
      'The average time is saved automatically.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Take a rest break and repeat the test.', source: ILLUSTRATIVE },
        { text: 'Check last night’s sleep and the cabin CO2 reading.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Do not perform safety-critical tasks until you have rested and re-tested.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'reactionTime', label: 'Reaction time', min: 150, max: 800, step: 5 }],
  },

  vision: {
    id: 'vision',
    label: 'Visual Check (SANS)',
    unit: '',
    zone: 'neuro',
    hazards: ['gravity'],
    ranges: { green: 'Normal', yellow: 'Mild blur', red: 'Severe change' },
    source: ILLUSTRATIVE,
    why: {
      text: 'SANS is NASA’s leading spaceflight health risk: about 70% of ISS astronauts get some swelling at the back of the eye as fluids shift toward the head.',
      source: SRC.sans,
    },
    howToMeasure: [
      'Hold the printed grid card at reading distance and cover one eye.',
      'Look at the centre dot. Are any lines wavy, blurred or missing?',
      'Read the smallest line of text you can. Compare with last week.',
      'Repeat with the other eye, then select Normal, Mild blur or Severe change.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Report the change; countermeasures such as thigh cuffs and supplements are being tested by NASA.', source: SRC.research },
        { text: 'Repeat the visual check tomorrow, at the same time of day.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Ask for an eye imaging session (fundoscope) so the flight surgeon can see the back of the eye.', source: SRC.sans },
        ESCALATE_RED,
      ],
    },
    fields: [],
  },

  exercise: {
    id: 'exercise',
    label: 'Exercise Today',
    unit: 'min',
    zone: 'musculo',
    hazards: ['gravity'],
    ranges: { green: '120 or more', yellow: '60–119', red: 'Below 60' },
    source: SRC.csaExercise,
    why: {
      text: 'Astronauts lose 1–1.5% of bone density per month, mostly in the spine and hips, and lose muscle strength. Resistive exercise helps.',
      source: SRC.bone,
    },
    howToMeasure: [
      'Add up today’s minutes on the resistive exercise device, treadmill and cycle.',
      'Count only the time you were actually exercising.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Add a resistive exercise session today.', source: SRC.bone },
      ],
      red: [
        { text: 'Do a resistive exercise session today and do not skip tomorrow’s.', source: SRC.bone },
        { text: 'Ask the flight surgeon about medication: bisphosphonates may reduce some bone loss.', source: SRC.bone },
        { text: 'Drink enough water: bone calcium loss and dehydration raise kidney-stone risk.', source: SRC.gravity },
      ],
    },
    fields: [{ key: 'exercise', label: 'Exercise', min: 0, max: 180, step: 5 }],
  },

  radiationDose: {
    id: 'radiationDose',
    label: 'Cumulative Radiation Dose',
    unit: 'mSv',
    zone: 'immune',
    hazards: ['radiation'],
    ranges: { green: 'Below 150', yellow: '150–599', red: '600 or above' },
    source: SRC.nasaRadLimit,
    why: {
      text: 'Astronauts receive more radiation in space than on Earth, which can lead to certain cancers. Neutrons are about 30% of the radiation on the ISS.',
      source: SRC.csaRadiation,
    },
    howToMeasure: [
      'Read the cumulative dose from your personal dosimeter.',
      'Enter the total for the mission so far, in mSv.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Spend rest time in the best-shielded part of the habitat.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Limit time outside the best-shielded area and review the dose plan.', source: ILLUSTRATIVE },
        ESCALATE_RED,
      ],
    },
    fields: [{ key: 'radiationDose', label: 'Cumulative dose', min: 0, max: 1000, step: 1 }],
  },

  spe: {
    id: 'spe',
    label: 'Solar Particle Event',
    unit: '',
    zone: 'immune',
    hazards: ['radiation'],
    ranges: { green: 'No event', yellow: 'Event in progress (ISS)', red: 'Event in progress (beyond Earth’s magnetic field)' },
    source: ILLUSTRATIVE,
    why: {
      text: 'Moon and Mars crews travel beyond the protection of Earth’s magnetic field, so solar storms matter more there than on the ISS.',
      source: SRC.radiationCancer,
    },
    howToMeasure: [
      'Check the space-weather alert on the habitat display.',
      'Switch the toggle on while an event is in progress.',
    ],
    countermeasures: {
      yellow: [
        { text: 'Stay inside and move to the best-shielded module until the event ends.', source: ILLUSTRATIVE },
      ],
      red: [
        { text: 'Storm Shelter protocol: stop surface work and move to the best-shielded area now.', source: ILLUSTRATIVE },
        { text: 'Log your dosimeter reading every hour during the event.', source: ILLUSTRATIVE },
      ],
    },
    fields: [],
  },
};

export const METRIC_ORDER: MetricId[] = [
  'bloodPressure',
  'heartRate',
  'spo2',
  'respRate',
  'cabinCo2',
  'glucose',
  'hydration',
  'temperature',
  'sleep',
  'mood',
  'reactionTime',
  'vision',
  'exercise',
  'radiationDose',
  'spe',
];

// ---------------------------------------------------------------------------
// Body zones (the 5 clickable areas of the astronaut map)
// ---------------------------------------------------------------------------

export interface Zone {
  id: ZoneId;
  name: string;
  organs: string;
  hazards: HazardId[];
  metrics: MetricId[];
  /** Plain-English "why space causes this". */
  whySpace: Fact[];
  /** General countermeasures for this body system. */
  countermeasures: Fact[];
}

export const ZONES: Record<ZoneId, Zone> = {
  neuro: {
    id: 'neuro',
    name: 'Neuro-Ocular & CNS',
    organs: 'Brain and eyes',
    hazards: ['gravity', 'isolation', 'environment'],
    metrics: ['vision', 'reactionTime', 'sleep', 'mood'],
    whySpace: [
      {
        text: 'Without gravity, body fluids shift toward the head. About 70% of ISS astronauts get some swelling at the back of the eye (SANS), NASA’s leading spaceflight health risk.',
        source: SRC.sans,
      },
      {
        text: 'About 16 sunrises a day on the ISS disrupt the body clock and sleep.',
        source: SRC.sleep,
      },
      {
        text: 'Isolation can cause anxiety and depression, which affect sleep, morale and decisions.',
        source: SRC.behavioral,
      },
      {
        text: 'Most astronauts also get space motion sickness and disorientation when gravity changes.',
        source: SRC.sensorimotor,
      },
    ],
    countermeasures: [
      { text: 'Follow LED lighting that mimics day and night, and keep scheduled rest.', source: SRC.sleep },
      { text: 'Journaling, family contact, plants, window time and privacy support mental health.', source: SRC.behavioral },
      { text: 'Thigh cuffs and supplements are being tested against fluid shift and SANS.', source: SRC.research },
    ],
  },
  cardio: {
    id: 'cardio',
    name: 'Cardiopulmonary & Cabin Air',
    organs: 'Heart and lungs',
    hazards: ['gravity', 'environment'],
    metrics: ['bloodPressure', 'heartRate', 'spo2', 'respRate', 'cabinCo2'],
    whySpace: [
      {
        text: 'The heart and blood vessels adapt to weightlessness: risks include clots, arrhythmia and low blood pressure, with fainting at landing. The heart becomes more spherical.',
        source: SRC.cardio,
      },
      {
        text: 'In a closed habitat the crew shares the same recycled air, so cabin air quality directly affects breathing.',
        source: ILLUSTRATIVE,
      },
      {
        text: 'On the Moon, fine regolith dust may irritate eyes and airways after surface work.',
        source: ILLUSTRATIVE,
      },
    ],
    countermeasures: [
      { text: 'Regular exercise and a healthy diet protect the heart.', source: SRC.cardio },
      { text: 'Lower-body compression garments and drinking fluids before landing reduce fainting risk.', source: SRC.cardio },
      { text: 'Ultrasound is used in space to check the heart and vessels.', source: SRC.cardio },
    ],
  },
  metabolic: {
    id: 'metabolic',
    name: 'Metabolic & Renal',
    organs: 'Digestive system and kidneys',
    hazards: ['gravity', 'environment', 'distance'],
    metrics: ['glucose', 'hydration', 'temperature'],
    whySpace: [
      {
        text: 'Bones release calcium in weightlessness; together with dehydration this raises the risk of kidney stones.',
        source: SRC.gravity,
      },
      {
        text: 'Immune changes in space can let dormant viruses reactivate; ISS astronauts reported cold sores, rashes, atypical allergies and infections.',
        source: SRC.immune,
      },
      {
        text: 'Far from Earth, crews must handle medical problems with little help from the ground, using only what they carry.',
        source: SRC.distance,
      },
    ],
    countermeasures: [
      { text: 'Drink enough water every day to lower kidney-stone risk.', source: SRC.gravity },
      { text: 'Eat the planned meals; report fever or a new rash early.', source: ILLUSTRATIVE },
    ],
  },
  musculo: {
    id: 'musculo',
    name: 'Musculoskeletal',
    organs: 'Bones, muscles and limbs',
    hazards: ['gravity'],
    metrics: ['exercise'],
    whySpace: [
      {
        text: 'Bones lose 1–1.5% of their density per month on 4–6 month missions, mostly in the spine and hips.',
        source: SRC.bone,
      },
      {
        text: 'Without the load of gravity, muscles lose strength and the heart and vessels lose fitness.',
        source: SRC.gravity,
      },
    ],
    countermeasures: [
      { text: 'Daily resistive exercise helps keep bone and muscle.', source: SRC.bone },
      { text: 'Bisphosphonate medication may reduce some bone loss (flight surgeon decides).', source: SRC.bone },
    ],
  },
  immune: {
    id: 'immune',
    name: 'Immune & Radiation Shielding',
    organs: 'Whole body',
    hazards: ['radiation', 'environment'],
    metrics: ['radiationDose', 'spe'],
    whySpace: [
      {
        text: 'Astronauts receive more radiation than on Earth. It raises cancer risk and may affect the heart, blood vessels, eyes and cognition.',
        source: SRC.radiationCancer,
      },
      {
        text: 'Moon and Mars crews leave the protection of Earth’s magnetic field. Neutrons are about 30% of ISS radiation.',
        source: SRC.csaRadiation,
      },
      {
        text: 'Radiation, microgravity and poor sleep can alter the immune system.',
        source: SRC.immune,
      },
    ],
    countermeasures: [
      { text: 'Radiation instruments on board track exposure; NASA is building shielding for Artemis and Gateway.', source: SRC.radiationCancer },
      { text: 'During a solar storm, move to the best-shielded area (Storm Shelter protocol).', source: ILLUSTRATIVE },
    ],
  },
};

export const ZONE_ORDER: ZoneId[] = ['neuro', 'cardio', 'metabolic', 'musculo', 'immune'];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface Evaluation {
  status: Status;
  /** Short explanation of why the metric has this status. */
  note: string;
}

export interface EvalContext {
  symptoms: Symptoms;
  env: Environment;
  /** Sleep hours of the previous nights, oldest first (used for the 3-nights rule). */
  recentSleep: number[];
}

const STATUS_RANK: Record<Status, number> = { green: 0, yellow: 1, red: 2 };

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), 'green');
}

const ok = (note = 'Within range'): Evaluation => ({ status: 'green', note });
const caution = (note: string): Evaluation => ({ status: 'yellow', note });
const critical = (note: string): Evaluation => ({ status: 'red', note });

export function evaluateMetric(id: MetricId, v: Vitals, ctx: EvalContext): Evaluation {
  const s = ctx.symptoms;
  switch (id) {
    case 'bloodPressure': {
      if (v.systolic > 180 || v.diastolic > 120) return critical('Crisis range: re-test after 5 minutes');
      if (v.systolic >= 140 || v.diastolic >= 90) return critical('High (stage 2 range)');
      if (v.systolic < 90 || v.diastolic < 60) {
        return s.dizziness || s.fainting || s.blurredVision
          ? critical('Low reading with symptoms')
          : caution('Low reading, no symptoms');
      }
      if (v.systolic >= 120 || v.diastolic >= 80) return caution('Above normal');
      return ok();
    }
    case 'heartRate': {
      if (s.fainting || s.dizziness || s.shortBreath) return critical('Symptoms reported with this reading');
      if (v.heartRate < 50) return critical('Very slow');
      if (v.heartRate > 120) return critical('Very fast at rest');
      if (v.heartRate < 60) return caution('Slower than normal');
      if (v.heartRate > 100) return caution('Faster than normal at rest');
      return ok();
    }
    case 'spo2': {
      if (v.spo2 <= 90) return critical('Low oxygen level');
      if (v.spo2 <= 94) return caution('Slightly low');
      return ok();
    }
    case 'respRate': {
      if (v.respRate < 9 || v.respRate > 24) return critical('Far outside resting range');
      if (v.respRate < 12 || v.respRate > 20) return caution('Outside resting range');
      if (s.irritation) return caution('Airway or eye irritation reported');
      return ok();
    }
    case 'cabinCo2': {
      if (v.cabinCo2 >= 4000) return critical('High cabin CO2');
      if (v.cabinCo2 >= 2500) return caution('Elevated cabin CO2');
      return ok();
    }
    case 'glucose': {
      if (v.glucose >= 126) return critical('Diabetes range: repeat the test');
      if (v.glucose >= 100) return caution('Above normal fasting range');
      if (v.glucose < 70) return caution('Below normal');
      return ok();
    }
    case 'hydration': {
      if (v.hydration < 1.2) return critical('Very low fluid intake');
      if (v.hydration < ctx.env.hydrationGreenAt) return caution(`Below the ${ctx.env.hydrationGreenAt.toFixed(1)} L target`);
      return ok();
    }
    case 'temperature': {
      if (v.temperature >= 40) return critical('Very high fever');
      if (v.temperature < 35) return critical('Very low body temperature');
      if (v.temperature >= 38) return caution('Fever');
      if (v.temperature < 36) return caution('Below normal');
      return ok();
    }
    case 'sleep': {
      if (v.sleep < 5) return critical('Severe sleep loss');
      const lastTwo = ctx.recentSleep.slice(-2);
      if (v.sleep < 7 && lastTwo.length === 2 && lastTwo.every((h) => h < 7)) {
        return critical('Below 7 hours for 3 nights in a row');
      }
      if (v.sleep < 7) return caution('Less than 7 hours');
      return ok();
    }
    case 'mood': {
      if (v.mood <= 3) return critical('Very low mood or high stress');
      if (v.mood <= 6) return caution('Lower than usual');
      return ok();
    }
    case 'reactionTime': {
      if (v.reactionTime >= 500) return critical('Very slow reactions');
      if (v.reactionTime >= 350) return caution('Slower than normal');
      return ok();
    }
    case 'vision': {
      if (v.vision === 'severe') return critical('Severe vision change');
      if (v.vision === 'mild') return caution('Mild blur');
      if (s.blurredVision) return caution('Blurred vision reported');
      return ok('Normal');
    }
    case 'exercise': {
      if (v.exercise < 60) return critical('Very little exercise today');
      if (v.exercise < 120) return caution('Below the daily target');
      return ok();
    }
    case 'radiationDose': {
      if (v.radiationDose >= 600) return critical('High cumulative dose');
      if (v.radiationDose >= 150) return caution('Elevated cumulative dose');
      return ok();
    }
    case 'spe': {
      if (!v.spe) return ok('No event');
      return ctx.env.speStatus === 'red'
        ? critical('Solar storm outside Earth’s magnetic field')
        : caution('Solar storm in progress');
    }
  }
}

/** Formats the current value of a metric for display. */
export function formatMetric(id: MetricId, v: Vitals): string {
  switch (id) {
    case 'bloodPressure':
      return `${Math.round(v.systolic)}/${Math.round(v.diastolic)}`;
    case 'vision':
      return v.vision === 'normal' ? 'Normal' : v.vision === 'mild' ? 'Mild blur' : 'Severe change';
    case 'spe':
      return v.spe ? 'Event in progress' : 'No event';
    case 'hydration':
    case 'temperature':
    case 'sleep':
      return v[id].toFixed(1);
    default:
      return String(Math.round(v[id]));
  }
}

// ---------------------------------------------------------------------------
// Triage (Distance from Earth -> how far to escalate)
// ---------------------------------------------------------------------------

export type TriageLevel = 0 | 1 | 2 | 3;

export const TRIAGE_LEVELS: Record<TriageLevel, { title: string; subtitle: string }> = {
  0: { title: 'Nominal', subtitle: 'All indicators in range. Keep the routine; next check-in tomorrow.' },
  1: { title: 'Self-Care Protocol', subtitle: 'Level 1: Self-Care Countermeasure. Follow the steps below and re-measure.' },
  2: { title: 'Crew Assist Needed', subtitle: 'Level 2: Crew Medical Officer Assist. Ask the CMO to review your readings.' },
  3: {
    title: 'Transmit Urgent Telemetry to Earth Flight Surgeons',
    subtitle: 'Level 3: Urgent Telemetry Package to Ground Flight Surgeons.',
  },
};

export interface Finding {
  metric: MetricId;
  status: Status;
  value: string;
  note: string;
  /** True when the metric was also out of range at the previous check-in. */
  persisting: boolean;
}

export interface TriageResult {
  level: TriageLevel;
  title: string;
  subtitle: string;
  /** Why this level was chosen. */
  reason: string;
  /** Out-of-range metrics, worst first. */
  findings: Finding[];
  /** Ordered steps for the astronaut. On Mars, self-care comes first. */
  steps: string[];
  /** Countermeasures for the out-of-range metrics. */
  actions: Fact[];
  selfCareFirst: boolean;
}

export interface Assessment {
  metrics: Record<MetricId, Evaluation>;
  zones: Record<ZoneId, Status>;
  triage: TriageResult;
}

export const TREND_KEYS: NumericVitalKey[] = [
  'heartRate',
  'systolic',
  'diastolic',
  'spo2',
  'respRate',
  'cabinCo2',
  'glucose',
  'hydration',
  'temperature',
  'sleep',
  'mood',
  'reactionTime',
  'exercise',
  'radiationDose',
];

export const TREND_OPTIONS: { id: MetricId; keys: NumericVitalKey[] }[] = METRIC_ORDER.filter(
  (id) => METRICS[id].fields.length > 0,
).map((id) => ({ id, keys: METRICS[id].fields.map((f) => f.key) }));

function vitalsFromRecord(base: Vitals, record: DayRecord): Vitals {
  const copy: Vitals = { ...base };
  for (const key of TREND_KEYS) copy[key] = record[key];
  return copy;
}

/**
 * The main entry point: evaluates every metric, colours the 5 body zones and
 * decides the triage level.
 *
 * @param history previous check-ins, oldest first, NOT including today.
 */
export function assess(vitals: Vitals, symptoms: Symptoms, env: Environment, history: DayRecord[]): Assessment {
  const ctx: EvalContext = { symptoms, env, recentSleep: history.map((d) => d.sleep) };

  const metrics = {} as Record<MetricId, Evaluation>;
  for (const id of METRIC_ORDER) metrics[id] = evaluateMetric(id, vitals, ctx);

  // Was the metric also out of range at the previous check-in? (numeric metrics only)
  const yesterday = history[history.length - 1];
  const persisting = {} as Record<MetricId, boolean>;
  for (const id of METRIC_ORDER) {
    persisting[id] = false;
    if (!yesterday || METRICS[id].fields.length === 0 || metrics[id].status === 'green') continue;
    const before = evaluateMetric(id, vitalsFromRecord(vitals, yesterday), {
      symptoms: NO_SYMPTOMS,
      env,
      recentSleep: [],
    });
    persisting[id] = before.status !== 'green';
  }

  const zones = {} as Record<ZoneId, Status>;
  for (const zoneId of ZONE_ORDER) {
    zones[zoneId] = worstStatus(ZONES[zoneId].metrics.map((m) => metrics[m].status));
  }

  const findings: Finding[] = METRIC_ORDER.filter((id) => metrics[id].status !== 'green')
    .map((id) => ({
      metric: id,
      status: metrics[id].status,
      value: formatMetric(id, vitals),
      note: metrics[id].note,
      persisting: persisting[id],
    }))
    .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);

  const reds = findings.filter((f) => f.status === 'red');
  const yellows = findings.filter((f) => f.status === 'yellow');
  const persistingYellows = yellows.filter((f) => f.persisting);

  let level: TriageLevel = 0;
  let reason = 'All indicators are in the green range.';
  if (reds.length > 0) {
    level = 3;
    reason = `${reds.length} indicator${reds.length > 1 ? 's' : ''} in the red range: ${reds
      .map((f) => METRICS[f.metric].label)
      .join(', ')}.`;
  } else if (yellows.length >= env.yellowsForCrewAssist) {
    level = 2;
    reason = `${yellows.length} indicators are in the yellow range at the same time (limit for ${env.shortName}: ${env.yellowsForCrewAssist}).`;
  } else if (persistingYellows.length > 0) {
    level = 2;
    reason = `${persistingYellows.map((f) => METRICS[f.metric].label).join(', ')} out of range at two check-ins in a row.`;
  } else if (yellows.length > 0) {
    level = 1;
    reason = `${yellows.map((f) => METRICS[f.metric].label).join(', ')} slightly out of range.`;
  }

  // Countermeasures for everything that is out of range (no duplicates).
  const actions: Fact[] = [];
  const seen = new Set<string>();
  for (const f of findings) {
    const list = f.status === 'red' ? METRICS[f.metric].countermeasures.red : METRICS[f.metric].countermeasures.yellow;
    for (const fact of list) {
      if (!seen.has(fact.text)) {
        seen.add(fact.text);
        actions.push(fact);
      }
    }
  }

  const selfCareFirst = env.autonomousTriage;
  const roundTrip =
    env.commDelaySeconds >= 60 ? ` A reply can take ${Math.round((env.commDelaySeconds * 2) / 60)}+ minutes.` : '';
  let steps: string[] = [];
  if (level === 1) {
    steps = ['Do the self-care countermeasures below.', 'Re-measure in a few hours.', 'If it is still out of range tomorrow, ask the Crew Medical Officer.'];
  } else if (level === 2) {
    steps = ['Start the self-care countermeasures below.', 'Ask the Crew Medical Officer to review your readings today.', 'Re-measure after the countermeasures.'];
  } else if (level === 3) {
    steps = selfCareFirst
      ? [
          'Start the self-care countermeasures below now: do not wait for Earth.',
          'Call the Crew Medical Officer.',
          `Transmit the telemetry package to the flight surgeons.${roundTrip}`,
        ]
      : [
          'Transmit the telemetry package and contact the flight surgeon now.',
          'Call the Crew Medical Officer.',
          'Follow the countermeasures below while you wait.',
        ];
  }

  return {
    metrics,
    zones,
    triage: {
      level,
      title: TRIAGE_LEVELS[level].title,
      subtitle: TRIAGE_LEVELS[level].subtitle,
      reason,
      findings,
      steps,
      actions,
      selfCareFirst,
    },
  };
}

// ---------------------------------------------------------------------------
// Daily check-ins (saved in the browser)
// ---------------------------------------------------------------------------

/** Typical in-range values used to pre-fill the form before the first check-in. */
export const DEFAULT_VITALS: Vitals = {
  heartRate: 70,
  systolic: 115,
  diastolic: 75,
  spo2: 98,
  respRate: 15,
  cabinCo2: 2000,
  glucose: 90,
  hydration: 2.2,
  temperature: 36.7,
  sleep: 7.5,
  mood: 7,
  reactionTime: 300,
  vision: 'normal',
  exercise: 120,
  radiationDose: 0,
  spe: false,
};

/** Values that came from a connected Bluetooth device (all others were entered by hand). */
export type DeviceSources = Partial<Record<NumericVitalKey, string>>;

/** One saved daily check-in. One per calendar day; saving again updates that day. */
export interface CheckIn {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Time of the last save, ISO string. */
  savedAt: string;
  vitals: Vitals;
  symptoms: Symptoms;
  /** Which values came from which device (device name), if any. */
  sources?: DeviceSources;
}

/** Local date as YYYY-MM-DD (not UTC, so the day changes at local midnight). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from date a to date b (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** Mission day number for a date: the start date is day 1. */
export function missionDayFor(date: string, missionStart: string): number {
  return Math.max(1, daysBetween(missionStart, date) + 1);
}

/** Turns saved check-ins into the history records the engine and the chart use. */
export function toDayRecords(checkIns: CheckIn[], missionStart: string): DayRecord[] {
  return [...checkIns]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => {
      const record = { day: missionDayFor(c.date, missionStart) } as DayRecord;
      for (const key of TREND_KEYS) record[key] = c.vitals[key];
      return record;
    });
}

/**
 * Check-in streak: the number of days in a row with a saved check-in,
 * ending today (or yesterday, if today's check-in is not done yet).
 */
export function checkInStreak(checkIns: CheckIn[], today: string): number {
  const dates = new Set(checkIns.map((c) => c.date));
  let day = today;
  if (!dates.has(day)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    day = localDateKey(y);
  }
  let streak = 0;
  const cursor = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  while (dates.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Hours until a re-measure reminder, by status. */
export const REMEASURE_HOURS: Record<Exclude<Status, 'green'>, number> = { yellow: 4, red: 1 };
