import { Activity, BookOpen, SlidersHorizontal, Trash2, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiExplain } from './components/AiExplain';
import { AstronautMap } from './components/AstronautMap';
import { CheckInCard, type Reminder } from './components/CheckInCard';
import { DevicePanel } from './components/DevicePanel';
import type { ConnectedDevice, DeviceReading } from './bluetooth/healthDevices';
import { GuidanceDrawer } from './components/GuidanceDrawer';
import { Header } from './components/Header';
import { SpaceBackground } from './components/SpaceBackground';
import { IntroSplash } from './components/IntroSplash';
import { TrendPanel } from './components/TrendPanel';
import { TriageBanner } from './components/TriageBanner';
import { VitalsPanel } from './components/VitalsPanel';
import { Panel, SourceTag } from './components/ui';
import {
  DEFAULT_VITALS,
  DISCLAIMER,
  ENVIRONMENTS,
  ILLUSTRATIVE,
  METRIC_ORDER,
  NO_SYMPTOMS,
  REMEASURE_HOURS,
  SOURCE_LABELS,
  assess,
  checkInStreak,
  localDateKey,
  missionDayFor,
  toDayRecords,
  type CheckIn,
  type DeviceSources,
  type EnvironmentId,
  type MetricId,
  type NumericVitalKey,
  type Symptoms,
  type VisionCheck,
  type Vitals,
  type ZoneId,
} from './data/spaceHealthEngine';

const STORAGE_KEY = 'biomatrix-data-v2';

/** Everything saved in this browser (nothing is sent to a server). */
interface SavedState {
  envId: EnvironmentId;
  /** First day of the mission, YYYY-MM-DD (mission day 1). */
  missionStart: string;
  /** Values currently in the form (not yet saved, or today's saved values). */
  vitals: Vitals;
  symptoms: Symptoms;
  /** Which form values came from a connected device (device name). */
  sources: DeviceSources;
  /** One saved check-in per day, oldest first. */
  checkIns: CheckIn[];
  reminders: Reminder[];
}

function freshState(): SavedState {
  return {
    envId: 'iss',
    missionStart: localDateKey(),
    vitals: { ...DEFAULT_VITALS },
    symptoms: { ...NO_SYMPTOMS },
    sources: {},
    checkIns: [],
    reminders: [],
  };
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as SavedState;
      if (
        saved &&
        ENVIRONMENTS[saved.envId] &&
        typeof saved.missionStart === 'string' &&
        saved.vitals &&
        saved.symptoms &&
        Array.isArray(saved.checkIns) &&
        Array.isArray(saved.reminders)
      ) {
        return { ...saved, vitals: { ...DEFAULT_VITALS, ...saved.vitals }, sources: saved.sources ?? {} };
      }
    }
  } catch {
    // Storage unavailable or corrupted: start fresh.
  }
  return freshState();
}

/** Indicators that make sense to measure again a few hours later. */
const REMEASURABLE = METRIC_ORDER.filter((id) => id !== 'radiationDose' && id !== 'spe');

export default function App() {
  const [state, setState] = useState<SavedState>(loadState);
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [intro, setIntro] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Connected Bluetooth devices (they reconnect by pressing "Connect device" again after a reload).
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  // Devices the user disconnected: late packets from them are ignored.
  const disconnectedIds = useRef(new Set<string>());

  // A clock for reminders and for the date changing at midnight.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = localDateKey(now);
  const missionDay = missionDayFor(today, state.missionStart);
  const env = ENVIRONMENTS[state.envId];
  const todayCheckIn = state.checkIns.find((c) => c.date === today) ?? null;
  // Date the next save goes to: today, or a missed earlier day.
  const [saveDate, setSaveDate] = useState(today);
  const effectiveSaveDate = saveDate > today || saveDate < state.missionStart ? today : saveDate;

  // Previous check-ins (not today) feed the trend chart and the "two check-ins in a row" rule.
  const history = useMemo(
    () => toDayRecords(state.checkIns.filter((c) => c.date < today), state.missionStart),
    [state.checkIns, state.missionStart, today],
  );
  const assessment = useMemo(
    () => assess(state.vitals, state.symptoms, env, history),
    [state.vitals, state.symptoms, env, history],
  );
  const streak = useMemo(() => checkInStreak(state.checkIns, today), [state.checkIns, today]);

  // Save to the browser on every change (works fully offline).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore: the app still works without storage.
    }
  }, [state]);

  const saveCheckIn = () => {
    const savedAt = new Date().toISOString();
    const date = effectiveSaveDate;
    const isToday = date === today;
    setState((s) => {
      const checkIn: CheckIn = {
        date,
        savedAt,
        vitals: { ...s.vitals },
        symptoms: { ...s.symptoms },
        sources: { ...s.sources },
      };
      const checkIns = [...s.checkIns.filter((c) => c.date !== date), checkIn].sort((a, b) => a.date.localeCompare(b.date));
      if (!isToday) return { ...s, checkIns };
      // A "measure again" reminder for each out-of-range indicator: 4 h for caution, 1 h for critical.
      const reminders: Reminder[] = REMEASURABLE.flatMap((id: MetricId) => {
        const status = assessment.metrics[id].status;
        if (status === 'green') return [];
        return [{ metric: id, due: new Date(Date.now() + REMEASURE_HOURS[status] * 3_600_000).toISOString() }];
      });
      return { ...s, checkIns, reminders };
    });
    if (!isToday) setSaveDate(today);
  };

  // A value arrived from a Bluetooth device: fill it in and mark where it came from.
  const onDeviceReading = useCallback((reading: DeviceReading, deviceName: string, deviceId: string) => {
    if (disconnectedIds.current.has(deviceId)) return;
    setLastSeen((l) => ({ ...l, [deviceId]: new Date().toISOString() }));
    setState((s) => {
      const vitals = { ...s.vitals };
      const sources = { ...s.sources };
      if (reading.kind === 'heartRate') {
        vitals.heartRate = reading.bpm;
        sources.heartRate = deviceName;
      } else if (reading.kind === 'bloodPressure') {
        vitals.systolic = reading.systolic;
        vitals.diastolic = reading.diastolic;
        sources.systolic = deviceName;
        sources.diastolic = deviceName;
      } else if (reading.kind === 'temperature') {
        vitals.temperature = reading.celsius;
        sources.temperature = deviceName;
      } else if (reading.kind === 'spo2') {
        vitals.spo2 = reading.percent;
        sources.spo2 = deviceName;
      }
      return { ...s, vitals, sources };
    });
  }, []);

  const onDeviceConnected = useCallback((device: ConnectedDevice) => {
    disconnectedIds.current.delete(device.id);
    setDevices((list) => [...list.filter((d) => d.id !== device.id), device]);
  }, []);
  const onDeviceDisconnected = useCallback((deviceId: string) => {
    disconnectedIds.current.add(deviceId);
    setDevices((list) => list.filter((d) => d.id !== deviceId));
  }, []);

  const dismissReminder = (metric: MetricId) =>
    setState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.metric !== metric) }));

  const deleteAllData = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    devices.forEach((d) => {
      d.disconnect();
      disconnectedIds.current.add(d.id);
    });
    setDevices([]);
    setState(freshState());
    setSaveDate(today);
    setConfirmDelete(false);
    setSelectedZone(null);
  };

  // A value typed or slid by hand is no longer "from device".
  const setVital = (key: NumericVitalKey, value: number) =>
    setState((s) => {
      const sources = { ...s.sources };
      delete sources[key];
      return { ...s, vitals: { ...s.vitals, [key]: value }, sources };
    });
  const setVision = (vision: VisionCheck) => setState((s) => ({ ...s, vitals: { ...s.vitals, vision } }));
  const setSpe = (spe: boolean) => setState((s) => ({ ...s, vitals: { ...s.vitals, spe } }));
  const setSymptom = (key: keyof Symptoms, value: boolean) =>
    setState((s) => ({ ...s, symptoms: { ...s.symptoms, [key]: value } }));
  const setEnv = (envId: EnvironmentId) => setState((s) => ({ ...s, envId }));
  const setMissionStart = (missionStart: string) => setState((s) => ({ ...s, missionStart }));
  const closeDrawer = useCallback(() => setSelectedZone(null), []);
  const finishIntro = useCallback(() => setIntro(false), []);

  return (
    <div className="relative min-h-screen text-slate-200">
      <SpaceBackground />
      <Header
        env={env}
        missionDay={missionDay}
        missionStart={state.missionStart}
        streak={streak}
        totalCheckIns={state.checkIns.length}
        onEnvChange={setEnv}
        onMissionStartChange={setMissionStart}
      />

      <main className={`relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-4 xl:grid-cols-12 ${intro ? '' : 'dash-reveal'}`}>
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-7">
          <Panel
            title="Astronaut body map"
            icon={<Activity className="h-4 w-4 text-sky-300" aria-hidden="true" />}
            right={<span className="text-[11px] text-slate-500">Click a zone for medical guidance</span>}
          >
            <AstronautMap
              assessment={assessment}
              vitals={state.vitals}
              selected={selectedZone}
              onSelect={setSelectedZone}
              onClear={closeDrawer}
            />
            <p className="mt-4 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{env.name}:</span> {env.note.text}{' '}
              <SourceTag source={env.note.source} /> {env.magnetosphere.text} <SourceTag source={env.magnetosphere.source} />
            </p>
          </Panel>

          <Panel title="History trend" icon={<TrendingUp className="h-4 w-4 text-sky-300" aria-hidden="true" />}>
            <TrendPanel history={history} vitals={state.vitals} missionDay={missionDay} />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          <CheckInCard
            savedAt={todayCheckIn?.savedAt ?? null}
            reminders={state.reminders}
            now={now}
            today={today}
            saveDate={effectiveSaveDate}
            minDate={state.missionStart}
            savedDates={state.checkIns.map((c) => c.date)}
            onSaveDateChange={setSaveDate}
            onSave={saveCheckIn}
            onDismiss={dismissReminder}
          />

          <TriageBanner triage={assessment.triage} env={env} />

          <AiExplain assessment={assessment} vitals={state.vitals} env={env} missionDay={missionDay} />

          <Panel
            title="Vitals input"
            icon={<SlidersHorizontal className="h-4 w-4 text-sky-300" aria-hidden="true" />}
            right={<span className="text-[11px] text-slate-500">Change any value: zones and triage update at once</span>}
          >
            <VitalsPanel
              vitals={state.vitals}
              symptoms={state.symptoms}
              sources={state.sources}
              devicePanel={
                <DevicePanel
                  devices={devices}
                  lastSeen={lastSeen}
                  onConnected={onDeviceConnected}
                  onDisconnected={onDeviceDisconnected}
                  onReading={onDeviceReading}
                />
              }
              assessment={assessment}
              onVital={setVital}
              onVision={setVision}
              onSpe={setSpe}
              onSymptom={setSymptom}
              onOpenZone={setSelectedZone}
            />
            <button
              type="button"
              onClick={saveCheckIn}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-sky-300/60 bg-sky-400/20 text-sm font-semibold text-sky-50 shadow-md shadow-sky-950/50 transition hover:-translate-y-0.5 hover:bg-sky-400/30 active:translate-y-0"
            >
              {effectiveSaveDate !== today
                ? `Save check-in for ${effectiveSaveDate}`
                : todayCheckIn
                  ? 'Update today\'s check-in'
                  : 'Save today\'s check-in'}
            </button>
          </Panel>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800 bg-slate-950/70 backdrop-blur-sm">
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              BioMatrix | 2026 NASA Space Apps Challenge. Your check-ins are stored only in this browser. This project is not
              endorsed by NASA.
            </p>
            <button
              type="button"
              onClick={deleteAllData}
              onBlur={() => setConfirmDelete(false)}
              className={`flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs transition ${
                confirmDelete
                  ? 'border-rose-400 bg-rose-500/20 font-semibold text-rose-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {confirmDelete ? 'Click again to delete all my data' : 'Delete my data'}
            </button>
          </div>
        </div>
      </footer>

      {intro && <IntroSplash onDone={finishIntro} />}

      {selectedZone && (
        <GuidanceDrawer zoneId={selectedZone} assessment={assessment} vitals={state.vitals} onClose={closeDrawer} />
      )}
    </div>
  );
}
