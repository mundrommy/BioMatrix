import { Moon, Radio, Rocket, RotateCcw, Satellite, Truck, Watch } from 'lucide-react';
import { BioMatrixLogo } from './BioMatrixLogo';
import type { ReactNode } from 'react';
import {
  ENVIRONMENTS,
  ENVIRONMENT_ORDER,
  PRESETS,
  type Environment,
  type EnvironmentId,
} from '../data/spaceHealthEngine';
import { SourceTag } from './ui';

const ENV_ICONS: Record<EnvironmentId, ReactNode> = {
  iss: <Satellite className="h-3.5 w-3.5" aria-hidden="true" />,
  moon: <Moon className="h-3.5 w-3.5" aria-hidden="true" />,
  mars: <Rocket className="h-3.5 w-3.5" aria-hidden="true" />,
  rover: <Truck className="h-3.5 w-3.5" aria-hidden="true" />,
};

interface HeaderProps {
  env: Environment;
  missionDay: number;
  presetId: string | null;
  live: boolean;
  onEnvChange: (id: EnvironmentId) => void;
  onPreset: (id: string) => void;
  onLiveChange: (live: boolean) => void;
  onReset: () => void;
}

export function Header({ env, missionDay, presetId, live, onEnvChange, onPreset, onLiveChange, onReset }: HeaderProps) {
  return (
    <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3">
        {/* Row 1: brand, environment, link status */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <BioMatrixLogo className="h-11 w-11 shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]" />
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-[0.2em] text-slate-100">BIOMATRIX</h1>
              <p className="text-xs text-slate-400">
                Autonomous Crew Health Monitor <span className="text-slate-600">|</span>{' '}
                <span className="font-mono text-sky-300">Mission Day {missionDay}</span>
              </p>
            </div>
          </div>

          <div role="group" aria-label="Mission environment" className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            {ENVIRONMENT_ORDER.map((id) => {
              const active = id === env.id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  title={ENVIRONMENTS[id].name}
                  onClick={() => onEnvChange(id)}
                  className={`flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                    active
                      ? 'bg-sky-400 text-slate-950 shadow shadow-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {ENV_ICONS[id]}
                  {ENVIRONMENTS[id].shortName}
                </button>
              );
            })}
          </div>

          <dl className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5">
              <dt className="text-slate-500">Gravity</dt>
              <dd className="font-mono font-semibold text-slate-100">{env.gravity}</dd>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5">
              <dt className="text-slate-500">Radiation</dt>
              <dd className="font-mono font-semibold text-slate-100">~{env.radiationPerDay.mSv.toFixed(1)} mSv/day</dd>
              <SourceTag source={env.radiationPerDay.source} />
            </div>
            {env.dustAlert && (
              <div className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 font-semibold text-amber-300">
                Regolith dust alert <SourceTag source={env.note.source} />
              </div>
            )}
          </dl>

          <div
            className={`ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
              env.autonomousTriage
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            }`}
            role="status"
          >
            <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Earth link:</span> {env.commDelay.text}
              {env.autonomousTriage && <span className="font-semibold"> | Autonomous Triage Active</span>}
            </span>
            <SourceTag source={env.commDelay.source} />
          </div>
        </div>

        {/* Row 2: demo scenarios and wearable sync */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo scenarios</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = preset.id === presetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  title={preset.description}
                  onClick={() => onPreset(preset.id)}
                  className={`min-h-9 rounded-full border px-4 text-xs font-semibold transition ${
                    active
                      ? 'border-sky-300 bg-sky-400/20 text-sky-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400/60 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <Watch className={`h-4 w-4 ${live ? 'text-emerald-300' : 'text-slate-500'}`} aria-hidden="true" />
              <span>
                Bio-Monitor wearable sync{' '}
                <span className="rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                  Simulated
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={live}
                onChange={(e) => onLiveChange(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`relative h-6 w-11 rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-sky-300 ${
                  live ? 'border-emerald-400 bg-emerald-400/30' : 'border-slate-600 bg-slate-800'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
                    live ? 'left-[22px] bg-emerald-300' : 'left-0.5 bg-slate-400'
                  }`}
                />
              </span>
              <span className={`w-14 font-mono text-[11px] ${live ? 'text-emerald-300' : 'text-slate-500'}`}>
                {live ? 'LIVE' : 'MANUAL'}
              </span>
            </label>
            <button
              type="button"
              onClick={onReset}
              className="flex min-h-9 items-center gap-1.5 rounded-md border border-slate-700 px-3 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
