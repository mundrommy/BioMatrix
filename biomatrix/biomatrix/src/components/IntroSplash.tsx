import { useEffect, useMemo, useState } from 'react';
import { BioMatrixLogo } from './BioMatrixLogo';

/** How long the intro plays before it opens the dashboard (ms). */
const INTRO_MS = 4200;
/** Length of the exit animation (ms). Must match .intro-exit in index.css. */
const EXIT_MS = 700;

const BOOT_LINES = [
  'Linking Bio-Monitor telemetry',
  'Loading NASA HRP hazard models',
  'Calibrating autonomous triage',
];

/**
 * Opening animation: a starfield, the BioMatrix logo drawing itself,
 * the title, a short "system boot" sequence, then a zoom into the dashboard.
 * Click, Esc or "Skip intro" opens the dashboard at once.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const a = Math.sin(i * 12.9898) * 43758.5453;
        const b = Math.sin(i * 78.233) * 12345.6789;
        const rand1 = a - Math.floor(a);
        const rand2 = b - Math.floor(b);
        return {
          left: `${rand1 * 100}%`,
          top: `${rand2 * 100}%`,
          size: 1 + ((rand1 * 7) % 2),
          delay: `${(rand2 * 3).toFixed(2)}s`,
        };
      }),
    [],
  );

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setLeaving(true), reduce ? 900 : INTRO_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onDone, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setLeaving(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className={`intro fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-slate-950 ${
        leaving ? 'intro-exit' : ''
      }`}
      onClick={() => setLeaving(true)}
      role="dialog"
      aria-label="BioMatrix is starting"
    >
      {/* Starfield */}
      <div className="intro-stars absolute inset-0" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="intro-star absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
          />
        ))}
      </div>

      {/* Soft glow behind the logo */}
      <div className="intro-glow absolute h-[420px] w-[420px] rounded-full" aria-hidden="true" />

      {/* Logo: orbit ring, the BioMatrix cell and a satellite going round */}
      <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle className="intro-ring" cx="100" cy="100" r="86" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
        <circle
          className="intro-ring intro-ring-2"
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="#7dd3fc"
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
        <g className="intro-orbit">
          <circle cx="100" cy="14" r="4" fill="#7dd3fc" />
        </g>
      </svg>
      <BioMatrixLogo animated className="relative h-24 w-24 sm:h-28 sm:w-28" />
      </div>

      {/* Title */}
      <h1 className="intro-title relative mt-8 text-center text-3xl font-bold text-slate-50 sm:text-5xl">BIOMATRIX</h1>
      <p className="intro-sub relative mt-3 text-center text-xs uppercase tracking-[0.35em] text-sky-300 sm:text-sm">
        Autonomous Crew Health Monitor
      </p>

      {/* Boot sequence */}
      <div className="relative mt-10 w-72 max-w-[85vw] font-mono text-xs text-slate-300">
        {BOOT_LINES.map((line, i) => (
          <p key={line} className="intro-line flex items-center justify-between gap-3 py-0.5" style={{ animationDelay: `${1.6 + i * 0.6}s` }}>
            <span>{line}</span>
            <span className="text-emerald-300">OK</span>
          </p>
        ))}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="intro-progress h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" />
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setLeaving(true);
        }}
        className="absolute bottom-6 right-6 min-h-10 rounded-md border border-slate-700 px-4 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
      >
        Skip intro
      </button>
    </div>
  );
}
