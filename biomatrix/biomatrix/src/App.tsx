import { Activity, BookOpen, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AstronautMap } from './components/AstronautMap';
import { GuidanceDrawer } from './components/GuidanceDrawer';
import { Header } from './components/Header';
import { IntroSplash } from './components/IntroSplash';
import { TrendPanel } from './components/TrendPanel';
import { TriageBanner } from './components/TriageBanner';
import { VitalsPanel } from './components/VitalsPanel';
import { Panel, SourceTag } from './components/ui';
import {
  DEFAULT_PRESET,
  DISCLAIMER,
  ENVIRONMENTS,
  ILLUSTRATIVE,
  PRESETS,
  SOURCE_LABELS,
  assess,
  type DayRecord,
  type EnvironmentId,
  type NumericVitalKey,
  type Preset,
  type Symptoms,
  type VisionCheck,
  type Vitals,
  type ZoneId,
} from './data/spaceHealthEngine';

const STORAGE_KEY = 'biomatrix-state-v1';

/** Everything that is saved in the browser so a page refresh keeps the session. */
interface SavedState {
  envId: EnvironmentId;
  presetId: string | null;
  missionDay: number;
  vitals: Vitals;
  symptoms: Symptoms;
  /** Previous 13 days, oldest first (today is the live vitals). */
  history: DayRecord[];
}

function stateFromPreset(preset: Preset): SavedState {
  return {
    envId: preset.env,
    presetId: preset.id,
    missionDay: preset.missionDay,
    vitals: { ...preset.vitals },
    symptoms: { ...preset.symptoms },
    history: preset.trend.slice(0, -1),
  };
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as SavedState;
      if (saved && saved.vitals && saved.symptoms && Array.isArray(saved.history) && ENVIRONMENTS[saved.envId]) {
        return saved;
      }
    }
  } catch {
    // Storage unavailable or corrupted: fall back to the default preset.
  }
  return stateFromPreset(DEFAULT_PRESET);
}

export default function App() {
  const [state, setState] = useState<SavedState>(loadState);
  const [live, setLive] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [intro, setIntro] = useState(true);
  // Baseline values the simulated wearable varies around.
  const liveBase = useRef({ heartRate: state.vitals.heartRate, spo2: state.vitals.spo2, respRate: state.vitals.respRate });

  const env = ENVIRONMENTS[state.envId];
  const assessment = useMemo(
    () => assess(state.vitals, state.symptoms, env, state.history),
    [state.vitals, state.symptoms, env, state.history],
  );

  // Save to the browser on every change (works fully offline).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore: the app still works without storage.
    }
  }, [state]);

  // Simulated Bio-Monitor wearable: small live variations around the baseline.
  useEffect(() => {
    if (!live) return;
    const jitter = (range: number) => Math.round((Math.random() * 2 - 1) * range);
    const timer = window.setInterval(() => {
      const base = liveBase.current;
      setState((s) => ({
        ...s,
        vitals: {
          ...s.vitals,
          heartRate: base.heartRate + jitter(2),
          spo2: Math.min(100, base.spo2 + jitter(1)),
          respRate: base.respRate + jitter(1),
        },
      }));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [live]);

  const toggleLive = (on: boolean) => {
    liveBase.current = {
      heartRate: state.vitals.heartRate,
      spo2: state.vitals.spo2,
      respRate: state.vitals.respRate,
    };
    setLive(on);
  };

  const loadPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
    liveBase.current = {
      heartRate: preset.vitals.heartRate,
      spo2: preset.vitals.spo2,
      respRate: preset.vitals.respRate,
    };
    setState(stateFromPreset(preset));
    setSelectedZone(null);
  };

  const reset = () => {
    setLive(false);
    loadPreset(DEFAULT_PRESET.id);
  };

  const setVital = (key: NumericVitalKey, value: number) =>
    setState((s) => ({ ...s, vitals: { ...s.vitals, [key]: value } }));
  const setVision = (vision: VisionCheck) => setState((s) => ({ ...s, vitals: { ...s.vitals, vision } }));
  const setSpe = (spe: boolean) => setState((s) => ({ ...s, vitals: { ...s.vitals, spe } }));
  const setSymptom = (key: keyof Symptoms, value: boolean) =>
    setState((s) => ({ ...s, symptoms: { ...s.symptoms, [key]: value } }));
  const setEnv = (envId: EnvironmentId) => setState((s) => ({ ...s, envId }));
  const closeDrawer = useCallback(() => setSelectedZone(null), []);
  const finishIntro = useCallback(() => setIntro(false), []);

  return (
    <div className="telemetry-grid min-h-screen bg-slate-950 text-slate-200">
      <Header
        env={env}
        missionDay={state.missionDay}
        presetId={state.presetId}
        live={live}
        onEnvChange={setEnv}
        onPreset={loadPreset}
        onLiveChange={toggleLive}
        onReset={reset}
      />

      <main className={`mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-4 xl:grid-cols-12 ${intro ? '' : 'dash-reveal'}`}>
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-7">
          <Panel
            title="Astronaut body map"
            icon={<Activity className="h-4 w-4 text-sky-300" aria-hidden="true" />}
            right={<span className="text-[11px] text-slate-500">Click a zone for medical guidance</span>}
          >
            <AstronautMap assessment={assessment} vitals={state.vitals} selected={selectedZone} onSelect={setSelectedZone} />
            <p className="mt-4 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{env.name}:</span> {env.note.text}{' '}
              <SourceTag source={env.note.source} /> {env.magnetosphere.text} <SourceTag source={env.magnetosphere.source} />
            </p>
          </Panel>

          <Panel title="14-day trend" icon={<TrendingUp className="h-4 w-4 text-sky-300" aria-hidden="true" />}>
            <TrendPanel history={state.history} vitals={state.vitals} missionDay={state.missionDay} />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          {/* The key resets the "transmitted" state when the scenario or level changes */}
          <TriageBanner key={`${state.presetId}-${state.envId}-${assessment.triage.level}`} triage={assessment.triage} env={env} />

          <Panel
            title="Vitals input"
            icon={<SlidersHorizontal className="h-4 w-4 text-sky-300" aria-hidden="true" />}
            right={<span className="text-[11px] text-slate-500">Change any value: zones and triage update at once</span>}
          >
            <VitalsPanel
              vitals={state.vitals}
              symptoms={state.symptoms}
              assessment={assessment}
              live={live}
              onVital={setVital}
              onVision={setVision}
              onSpe={setSpe}
              onSymptom={setSymptom}
              onOpenZone={setSelectedZone}
            />
          </Panel>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/90">
        <div className="mx-auto max-w-[1500px] space-y-3 px-4 py-4 text-xs text-slate-400">
          <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-medium text-amber-100">{DISCLAIMER}</p>

          <details>
            <summary className="flex min-h-9 cursor-pointer items-center gap-2 font-semibold text-slate-200">
              <BookOpen className="h-4 w-4 text-sky-300" aria-hidden="true" />
              Sources ({Object.keys(SOURCE_LABELS).length})
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 md:grid-cols-2">
              {Object.entries(SOURCE_LABELS).map(([url, label]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer noopener" className="text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 max-w-3xl">
              Values tagged <SourceTag source={ILLUSTRATIVE} /> are team design choices for this prototype. They are not NASA or
              CSA thresholds.
            </p>
          </details>

          <p>
            BioMatrix | 2026 NASA Space Apps Challenge prototype. All astronaut data shown is simulated demo data. This project
            is not endorsed by NASA.
          </p>
        </div>
      </footer>

      {intro && <IntroSplash onDone={finishIntro} />}

      {selectedZone && (
        <GuidanceDrawer zoneId={selectedZone} assessment={assessment} vitals={state.vitals} onClose={closeDrawer} />
      )}
    </div>
  );
}
