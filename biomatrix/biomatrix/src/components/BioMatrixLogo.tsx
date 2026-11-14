import { useId } from 'react';

/**
 * BioMatrix logo (original design): a hexagonal "cell" with a dot matrix
 * and a heartbeat line running through it.
 * With `animated`, the parts draw themselves (used by the intro).
 */
export function BioMatrixLogo({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  // Unique gradient id, so several logos can be on the page at once.
  const gradientId = `bm-grad-${useId().replace(/:/g, '')}`;
  const dots = [30, 50, 70].flatMap((y) => [30, 50, 70].map((x) => ({ x, y })));

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      {/* Hexagon cell */}
      <path
        className={animated ? 'logo-hex' : undefined}
        d="M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z"
        fill={`url(#${gradientId})`}
        fillOpacity="0.1"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Dot matrix */}
      <g className={animated ? 'logo-dots' : undefined}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="2.6" fill="#e0f2fe" fillOpacity={i === 4 ? 0 : 0.45} />
        ))}
      </g>

      {/* Heartbeat line */}
      <path
        className={animated ? 'logo-pulse' : undefined}
        d="M16 52 L33 52 L39 40 L47 68 L55 26 L61 52 L84 52"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
