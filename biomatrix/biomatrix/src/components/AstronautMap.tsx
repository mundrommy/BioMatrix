import { Bone, Brain, ChevronRight, Droplets, HeartPulse, ShieldAlert } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import {
  METRICS,
  ZONES,
  ZONE_ORDER,
  formatMetric,
  type Assessment,
  type Status,
  type Vitals,
  type ZoneId,
} from '../data/spaceHealthEngine';
import { STATUS_STYLE, StatusBadge } from './ui';

export const ZONE_ICONS: Record<ZoneId, ReactNode> = {
  neuro: <Brain className="h-4 w-4" aria-hidden="true" />,
  cardio: <HeartPulse className="h-4 w-4" aria-hidden="true" />,
  metabolic: <Droplets className="h-4 w-4" aria-hidden="true" />,
  musculo: <Bone className="h-4 w-4" aria-hidden="true" />,
  immune: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
};

interface MapProps {
  assessment: Assessment;
  vitals: Vitals;
  selected: ZoneId | null;
  onSelect: (zone: ZoneId) => void;
}

/** One clickable zone of the SVG. Works with mouse, touch and keyboard. */
function ZoneGroup({
  id,
  status,
  selected,
  onSelect,
  children,
}: {
  id: ZoneId;
  status: Status;
  selected: boolean;
  onSelect: (zone: ZoneId) => void;
  children: ReactNode;
}) {
  const style = STATUS_STYLE[status];
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${ZONES[id].name}: ${style.label}. Open medical guidance.`}
      aria-pressed={selected}
      className={`zone zone-${id} ${status === 'red' ? 'zone-critical' : ''} ${selected ? 'zone-selected' : ''}`}
      onClick={() => onSelect(id)}
      onKeyDown={onKeyDown}
    >
      {children}
    </g>
  );
}

/** Original human outline drawn by the team: one path for the body plus one for the head. */
const BODY_PATH =
  'M171 80 L 172 98 C 185 104 205 103 218 109 C 231 115 237 128 237 146 C 238 176 240 206 242 232 C 245 262 250 292 251 318 C 255 331 259 351 256 368 C 253 379 240 380 238 369 C 236 353 236 336 235 321 C 232 291 226 263 224 239 C 221 211 216 181 211 156 C 209 186 201 215 200 238 C 199 256 211 272 211 293 C 211 331 205 381 201 421 C 199 441 203 466 199 491 C 196 505 192 512 191 522 C 195 530 201 538 197 544 C 191 549 177 549 172 543 C 171 531 172 516 172 506 C 168 481 168 451 170 426 C 170 391 168 346 160 319 C 152 346 150 391 150 426 C 152 451 152 481 148 506 C 148 516 149 531 148 543 C 143 549 129 549 123 544 C 119 538 125 530 129 522 C 128 512 124 505 121 491 C 117 466 121 441 119 421 C 115 381 109 331 109 293 C 109 272 121 256 120 238 C 119 215 111 186 109 156 C 104 181 99 211 96 239 C 94 263 88 291 85 321 C 84 336 84 353 82 369 C 80 380 67 379 64 368 C 61 351 65 331 69 318 C 70 292 75 262 78 232 C 80 206 82 176 83 146 C 83 128 89 115 102 109 C 115 103 135 104 148 98 L 149 80 Z M136 52 A24 32 0 1 1 184 52 A24 32 0 1 1 136 52 Z';

/** Small repeatable random generator, so the stars are in the same place on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  color: string;
  twinkle: boolean;
  delay: number;
}

function makeStars(count: number, seed: number, area: { x: number; y: number; w: number; h: number }): Star[] {
  const rand = seeded(seed);
  const colors = ['#ffffff', '#e0f2fe', '#bae6fd', '#fde68a', '#c4b5fd'];
  return Array.from({ length: count }, () => ({
    x: area.x + rand() * area.w,
    y: area.y + rand() * area.h,
    r: 0.4 + rand() * rand() * 1.9,
    color: colors[Math.floor(rand() * colors.length)],
    twinkle: rand() > 0.6,
    delay: rand() * 4,
  }));
}

// Stars inside the body (clipped to the outline) and a few faint ones around it.
const BODY_STARS = makeStars(320, 7, { x: 60, y: 18, w: 200, h: 535 });
const SPACE_STARS = makeStars(28, 42, { x: 0, y: 0, w: 320, h: 600 });

/** Bones of the arms and legs: [x1, y1, x2, y2] for the right side; the left side is mirrored. */
const LIMB_BONES: [number, number, number, number][] = [
  [226, 134, 233, 228], // upper arm (humerus)
  [234, 240, 244, 316], // forearm
  [181, 300, 186, 416], // thigh (femur)
  [186, 428, 182, 514], // lower leg (tibia)
];
const mirrorBone = ([x1, y1, x2, y2]: [number, number, number, number]): [number, number, number, number] => [
  320 - x1,
  y1,
  320 - x2,
  y2,
];

/** Colour of the body outline: holographic cyan when the whole-body zone is fine. */
const OUTLINE_COLOR: Record<Status, string> = {
  green: '#7dd3fc',
  yellow: STATUS_STYLE.yellow.hex,
  red: STATUS_STYLE.red.hex,
};

/**
 * See-through human figure with glowing outline, stars inside and visible organs.
 * The 5 body zones take their status colour (green, amber or red).
 */
function AstronautSvg({ assessment, selected, onSelect }: Omit<MapProps, 'vitals'>) {
  const z = assessment.zones;
  const c = (zone: ZoneId) => STATUS_STYLE[z[zone]].hex;
  const outline = OUTLINE_COLOR[z.immune];

  return (
    <svg viewBox="0 0 320 600" className="mx-auto h-auto w-full max-w-[320px]" role="group" aria-label="Human body map with 5 clickable zones">
      <defs>
        <radialGradient id="lm-body-fill" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#1d4ed8" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.10" />
        </radialGradient>
        <radialGradient id="lm-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <filter id="lm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="lm-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="lm-body-clip">
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      {/* Faint stars around the figure (decoration) */}
      <g aria-hidden="true" pointerEvents="none">
        {SPACE_STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.8} fill={s.color} opacity="0.35" />
        ))}
      </g>

      {/* Holographic floor rings (decoration) */}
      <g aria-hidden="true" pointerEvents="none">
        <ellipse cx="160" cy="548" rx="110" ry="18" fill="url(#lm-floor)" />
        <ellipse className="floor-ring" cx="160" cy="548" rx="70" ry="10" fill="none" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.2" />
        <ellipse className="floor-ring floor-ring-2" cx="160" cy="548" rx="100" ry="15" fill="none" stroke="#7dd3fc" strokeOpacity="0.3" strokeWidth="1" />
        <ellipse cx="160" cy="548" rx="130" ry="20" fill="none" stroke="#7dd3fc" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 6" />
      </g>

      {/* 5. Immune & radiation shielding: the whole body */}
      <ZoneGroup id="immune" status={z.immune} selected={selected === 'immune'} onSelect={onSelect}>
        <path d={BODY_PATH} fill="url(#lm-body-fill)" />
        {/* soft inner rim light */}
        <path d={BODY_PATH} fill="none" stroke={outline} strokeWidth="12" strokeOpacity="0.14" clipPath="url(#lm-body-clip)" pointerEvents="none" />
        <g clipPath="url(#lm-body-clip)" pointerEvents="none" aria-hidden="true">
          {BODY_STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.color}
              className={s.twinkle ? 'star-twinkle' : undefined}
              style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
            />
          ))}
        </g>
        <path
          className="body-outline"
          d={BODY_PATH}
          fill="none"
          stroke={outline}
          strokeWidth="1.6"
          strokeOpacity="0.9"
          filter="url(#lm-glow)"
          pointerEvents="none"
        />
      </ZoneGroup>

      {/* 4. Musculoskeletal: skeleton. Wide invisible lines make the limbs easy to click. */}
      <ZoneGroup id="musculo" status={z.musculo} selected={selected === 'musculo'} onSelect={onSelect}>
        {[...LIMB_BONES, ...LIMB_BONES.map(mirrorBone)].map(([x1, y1, x2, y2], i) => (
          <line key={`hit-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="26" strokeLinecap="round" pointerEvents="stroke" />
        ))}
        <g className="organ" stroke={c('musculo')} strokeLinecap="round" fill="none" filter="url(#lm-soft-glow)" pointerEvents="none">
          {[...LIMB_BONES, ...LIMB_BONES.map(mirrorBone)].map(([x1, y1, x2, y2], i) => (
            <line key={`bone-${i}`} className="organ-line" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="3.2" strokeOpacity="0.75" />
          ))}
          {/* knees */}
          <circle cx="186" cy="422" r="4" strokeWidth="1.6" strokeOpacity="0.8" />
          <circle cx="134" cy="422" r="4" strokeWidth="1.6" strokeOpacity="0.8" />
          {/* collarbones */}
          <path d="M160 106 C 176 103 198 106 216 113 M160 106 C 144 103 122 106 104 113" strokeWidth="2" strokeOpacity="0.6" />
          {/* spine */}
          <path d="M160 100 L160 300" strokeWidth="3" strokeOpacity="0.35" strokeDasharray="4 3" />
          {/* pelvis */}
          <path d="M136 284 C 128 298 138 314 152 316 L 168 316 C 182 314 192 298 184 284 C 176 293 144 293 136 284 Z" strokeWidth="1.8" strokeOpacity="0.6" />
        </g>
      </ZoneGroup>

      {/* 3. Metabolic & renal: liver, stomach, kidneys, intestines, bladder */}
      <ZoneGroup id="metabolic" status={z.metabolic} selected={selected === 'metabolic'} onSelect={onSelect}>
        <g className="organ" fill={c('metabolic')} stroke={c('metabolic')} strokeWidth="1.2" filter="url(#lm-soft-glow)">
          {/* liver */}
          <path className="zone-shape" fillOpacity="0.2" d="M126 207 C 140 197 164 199 173 208 C 168 217 156 223 145 225 C 134 227 126 221 126 207 Z" />
          {/* stomach */}
          <path className="zone-shape" fillOpacity="0.2" d="M173 211 C 182 204 194 209 194 221 C 194 236 183 244 172 240 C 165 237 167 229 174 227 C 179 225 179 217 173 211 Z" />
          {/* kidneys */}
          <ellipse className="zone-shape" fillOpacity="0.42" cx="143" cy="248" rx="7" ry="12" transform="rotate(-12 143 248)" />
          <ellipse className="zone-shape" fillOpacity="0.42" cx="177" cy="248" rx="7" ry="12" transform="rotate(12 177 248)" />
          {/* intestines */}
          <path
            fill="none"
            strokeWidth="2"
            strokeOpacity="0.7"
            d="M140 266 C 150 258 170 258 180 266 C 186 274 176 280 166 278 C 152 276 146 284 154 290 C 162 296 176 294 182 287"
          />
          {/* bladder */}
          <ellipse className="zone-shape" fillOpacity="0.3" cx="160" cy="304" rx="9" ry="6" />
          {/* larger invisible click area for the abdomen */}
          <rect x="124" y="200" width="72" height="112" rx="20" fill="transparent" stroke="none" />
        </g>
      </ZoneGroup>

      {/* 2. Cardiopulmonary: windpipe, lungs and heart */}
      <ZoneGroup id="cardio" status={z.cardio} selected={selected === 'cardio'} onSelect={onSelect}>
        <g className="organ" fill={c('cardio')} stroke={c('cardio')} strokeWidth="1.2" filter="url(#lm-soft-glow)">
          {/* windpipe and bronchi */}
          <path fill="none" strokeWidth="2.4" strokeOpacity="0.8" d="M160 92 L160 124 M160 124 C 156 128 152 130 148 136 M160 124 C 164 128 168 130 172 136" />
          {/* lungs */}
          <path className="zone-shape" fillOpacity="0.14" d="M153 124 C 140 121 128 136 126 158 C 124 180 128 198 134 204 C 142 208 152 200 155 188 L 155 131 C 155 126 154 124 153 124 Z" />
          <path className="zone-shape" fillOpacity="0.14" d="M168 124 C 181 121 193 136 195 158 C 197 180 193 198 187 204 C 179 208 171 202 169 193 C 174 185 174 176 169 170 L 167 131 C 167 126 167 124 168 124 Z" />
          {/* larger invisible click area for the chest */}
          <rect x="124" y="118" width="74" height="90" rx="20" fill="transparent" stroke="none" />
          {/* heart (beats) */}
          <g transform="translate(165 170) scale(0.82) translate(-165 -170) rotate(-14 165 169)">
            <path
              className="zone-shape organ-heart"
              fillOpacity="0.85"
              strokeWidth="1.4"
              d="M165 158 C 160 149 148 151 149 162 C 150 172 158 179 166 187 C 174 179 182 172 182 162 C 182 151 170 149 165 158 Z"
            />
          </g>
        </g>
      </ZoneGroup>

      {/* 1. Neuro-ocular & CNS: brain and eyes */}
      <ZoneGroup id="neuro" status={z.neuro} selected={selected === 'neuro'} onSelect={onSelect}>
        <g className="organ" fill={c('neuro')} stroke={c('neuro')} strokeWidth="1.2" filter="url(#lm-soft-glow)">
          {/* invisible click area for the whole head */}
          <ellipse cx="160" cy="52" rx="24" ry="32" fill="transparent" stroke="none" />
          {/* brain */}
          <path className="zone-shape" fillOpacity="0.3" d="M141 42 C 139 31 149 24 160 25 C 171 24 181 31 179 42 C 179 49 171 52 160 51 C 149 52 141 49 141 42 Z" />
          <path
            fill="none"
            strokeWidth="1"
            strokeOpacity="0.85"
            d="M160 26 L160 50 M148 33 C 153 36 148 40 153 44 M172 33 C 167 36 172 40 167 44 M144 42 C 148 41 150 46 155 45 M176 42 C 172 41 170 46 165 45"
          />
          {/* eyes */}
          <ellipse className="zone-shape" fillOpacity="0.55" cx="151" cy="61" rx="5.5" ry="3.2" />
          <ellipse className="zone-shape" fillOpacity="0.55" cx="169" cy="61" rx="5.5" ry="3.2" />
          <circle cx="151" cy="61" r="1.4" fill="#f8fafc" stroke="none" />
          <circle cx="169" cy="61" r="1.4" fill="#f8fafc" stroke="none" />
          {/* optic nerves (SANS) */}
          <path fill="none" strokeWidth="1" strokeOpacity="0.7" d="M154 60 C 156 56 158 53 160 51 M166 60 C 164 56 162 53 160 51" />
        </g>
      </ZoneGroup>
    </svg>
  );
}

export function AstronautMap({ assessment, vitals, selected, onSelect }: MapProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
      <AstronautSvg assessment={assessment} selected={selected} onSelect={onSelect} />

      {/* The same 5 zones as normal buttons: easier to read and fully keyboard accessible */}
      <ul className="flex min-w-0 flex-col gap-2">
        {ZONE_ORDER.map((id, index) => {
          const zone = ZONES[id];
          const status = assessment.zones[id];
          const style = STATUS_STYLE[status];
          // Show the metric that needs the most attention in this zone.
          const focus =
            zone.metrics.find((m) => assessment.metrics[m].status === 'red') ??
            zone.metrics.find((m) => assessment.metrics[m].status === 'yellow') ??
            zone.metrics[0];
          const unit = METRICS[focus].unit;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-label={`${zone.name}: ${style.label}. Open medical guidance.`}
                className={`group flex w-full items-center gap-3 rounded-lg border bg-slate-950/60 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-slate-800/70 hover:shadow-lg hover:shadow-black/40 active:translate-y-0 ${
                  selected === id ? 'border-sky-300' : style.border
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${style.badge}`}>
                  {ZONE_ICONS[id]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {index + 1}. {zone.name}
                    </span>
                    <StatusBadge status={status} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">
                    {METRICS[focus].label}:{' '}
                    <span className="font-mono text-slate-200">
                      {formatMetric(focus, vitals)}
                      {unit ? ` ${unit}` : ''}
                    </span>
                    {assessment.metrics[focus].status !== 'green' && (
                      <span className={style.text}> | {assessment.metrics[focus].note}</span>
                    )}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
