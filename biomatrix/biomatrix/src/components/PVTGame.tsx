import { Play, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const TEST_SECONDS = 15;

type Phase = 'idle' | 'waiting' | 'target' | 'done';

interface PVTGameProps {
  /** Called with the average reaction time in ms when a test finishes. */
  onResult: (averageMs: number) => void;
}

/**
 * 15-second reaction test in the style of the Psychomotor Vigilance Test (PVT).
 * A target lights up at random intervals; the astronaut clicks as fast as possible.
 */
export function PVTGame({ onResult }: PVTGameProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(TEST_SECONDS);
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);

  // Refs hold the values the timers need without re-creating them on every render.
  const phaseRef = useRef<Phase>('idle');
  const shownAt = useRef(0);
  const endAt = useRef(0);
  const timesRef = useRef<number[]>([]);
  const nextTimer = useRef<number | undefined>(undefined);
  const tick = useRef<number | undefined>(undefined);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const clearTimers = () => {
    window.clearTimeout(nextTimer.current);
    window.clearInterval(tick.current);
  };

  useEffect(() => clearTimers, []);

  const finish = () => {
    clearTimers();
    setPhaseBoth('done');
    setRemaining(0);
    const all = timesRef.current;
    if (all.length > 0) {
      onResult(Math.round(all.reduce((a, b) => a + b, 0) / all.length));
    }
  };

  const scheduleTarget = () => {
    const delay = 900 + Math.random() * 1600;
    nextTimer.current = window.setTimeout(() => {
      if (performance.now() >= endAt.current) return;
      shownAt.current = performance.now();
      setPhaseBoth('target');
    }, delay);
  };

  const start = () => {
    clearTimers();
    timesRef.current = [];
    setTimes([]);
    setFalseStarts(0);
    setRemaining(TEST_SECONDS);
    endAt.current = performance.now() + TEST_SECONDS * 1000;
    setPhaseBoth('waiting');
    scheduleTarget();
    tick.current = window.setInterval(() => {
      const left = (endAt.current - performance.now()) / 1000;
      if (left <= 0) finish();
      else setRemaining(left);
    }, 100);
  };

  const hit = () => {
    if (phaseRef.current === 'target') {
      const rt = Math.round(performance.now() - shownAt.current);
      timesRef.current = [...timesRef.current, rt];
      setTimes(timesRef.current);
      setPhaseBoth('waiting');
      scheduleTarget();
    } else if (phaseRef.current === 'waiting') {
      setFalseStarts((n) => n + 1);
    }
  };

  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const running = phase === 'waiting' || phase === 'target';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Timer className="h-4 w-4 text-sky-300" aria-hidden="true" />
          15-second reaction test (PVT-style)
        </p>
        <p className="font-mono text-xs text-slate-400" aria-live="off">
          {running ? `${remaining.toFixed(1)} s left` : `${TEST_SECONDS} s`}
        </p>
      </div>

      {running ? (
        <button
          type="button"
          onPointerDown={hit}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              if (!e.repeat) hit();
            }
          }}
          autoFocus
          aria-label={phase === 'target' ? 'Target is on: click now' : 'Wait for the target'}
          className={`flex h-28 w-full select-none items-center justify-center rounded-lg border-2 text-sm font-bold uppercase tracking-widest transition-colors duration-75 ${
            phase === 'target'
              ? 'border-emerald-300 bg-emerald-400 text-slate-950'
              : 'border-slate-700 bg-slate-900 text-slate-500'
          }`}
        >
          {phase === 'target' ? 'Click!' : 'Wait...'}
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-sky-400/50 bg-sky-400/15 text-sm font-semibold text-sky-100 shadow-md shadow-sky-950/50 transition hover:-translate-y-0.5 hover:bg-sky-400/25 active:translate-y-0"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {phase === 'done' ? 'Run the test again' : 'Start reaction test'}
        </button>
      )}

      <p className="mt-2 text-xs text-slate-400" role="status">
        {phase === 'idle' && 'Click the pad as fast as you can each time it turns green. You can also press Space.'}
        {running && `Hits: ${times.length}${average !== null ? ` | average ${average} ms` : ''}${falseStarts ? ` | early clicks: ${falseStarts}` : ''}`}
        {phase === 'done' &&
          (average !== null
            ? `Done: ${times.length} hits, average ${average} ms${falseStarts ? `, ${falseStarts} early clicks` : ''}. Saved to Reaction Time.`
            : 'No hits recorded. Try again and click when the pad turns green.')}
      </p>
    </div>
  );
}
