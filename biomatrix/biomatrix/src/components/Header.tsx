import { CalendarDays, Flame, Moon, Radio, Rocket, Satellite, Truck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  ENVIRONMENTS,
  ENVIRONMENT_ORDER,
  localDateKey,
  type Environment,
  type EnvironmentId,
} from '../data/spaceHealthEngine';
import { BioMatrixLogo } from './BioMatrixLogo';
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
  missionStart: string;
  streak: number;
  totalCheckIns: number;
  onEnvChange: (id: EnvironmentId) => void;
  onMissionStartChange: (date: string) => void;
}

export function Header({
  env,
  missionDay,
  missionStart,
  streak,
  totalCheckIns,
  onEnvChange,
  onMissionStartChange,
}: HeaderProps) {
  const [editingStart, setEditingStart] = useState(false);

  return (
    <header className="header-line relative z-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        {/* Brand and mission day */}
        <div className="flex items-center gap-3">
          <BioMatrixLogo className="logo-live h-11 w-11 shrink-0" />
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-[0.2em] text-slate-100">BIOMATRIX</h1>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
              <span>Autonomous Crew Health Monitor</span>
              <span className="text-slate-600">|</span>
              {editingStart ? (
                <label className="flex items-center gap-1.5">
                  <span>Mission start</span>
                  <input
                    type="date"
                    autoFocus
                    value={missionStart}
                    max={localDateKey()}
                    onChange={(e) => e.target.value && onMissionStartChange(e.target.value)}
                    onBlur={() => setEditingStart(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setEditingStart(false);
                    }}
                    className="rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-100"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingStart(true)}
                  title="Change the mission start date"
                  className="flex items-center gap-1 rounded font-mono text-sky-300 hover:text-sky-100"
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Mission Day {missionDay}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mission environment (set once for the mission) */}
        <div role="group" aria-label="Mission environment" className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-1">
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
                  active ? 'bg-sky-400 text-slate-950 shadow shadow-sky-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {ENV_ICONS[id]}
                {ENVIRONMENTS[id].shortName}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Check-in streak (gamification) */}
          <div
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
              streak > 0 ? 'border-orange-400/40 bg-orange-400/10 text-orange-200' : 'border-slate-800 bg-slate-900/80 text-slate-400'
            }`}
            title={`${totalCheckIns} check-in${totalCheckIns === 1 ? '' : 's'} saved in total`}
          >
            <Flame className={`h-4 w-4 ${streak > 0 ? 'flame-live text-orange-300' : 'text-slate-500'}`} aria-hidden="true" />
            <span>
              <span className="font-semibold">{streak}-day</span> check-in streak
            </span>
          </div>

          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
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
      </div>
    </header>
  );
}
