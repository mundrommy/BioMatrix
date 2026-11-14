import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { isIllustrative, sourceLabel, type Fact, type Status } from '../data/spaceHealthEngine';

/** Colours and labels for the three health statuses. Colour is never used alone. */
export const STATUS_STYLE: Record<
  Status,
  { label: string; hex: string; text: string; badge: string; dot: string; border: string }
> = {
  green: {
    label: 'Optimal',
    hex: '#34d399',
    text: 'text-emerald-300',
    badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400',
    border: 'border-emerald-400/40',
  },
  yellow: {
    label: 'Caution',
    hex: '#fbbf24',
    text: 'text-amber-300',
    badge: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    dot: 'bg-amber-400',
    border: 'border-amber-400/50',
  },
  red: {
    label: 'Critical',
    hex: '#fb7185',
    text: 'text-rose-300',
    badge: 'border-rose-400/50 bg-rose-500/15 text-rose-300',
    dot: 'bg-rose-400',
    border: 'border-rose-400/60',
  },
};

export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === 'green' ? '' : 'status-dot-alert'}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}

/** Shows where a fact comes from: a link to the source, or an "Illustrative" tag. */
export function SourceTag({ source }: { source: string }) {
  if (isIllustrative(source)) {
    return (
      <span
        className="inline-flex items-center rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300"
        title={source}
      >
        Illustrative
      </span>
    );
  }
  return (
    <a
      href={source}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 hover:border-sky-300 hover:text-sky-200"
    >
      {sourceLabel(source)}
      <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
    </a>
  );
}

/** A sentence followed by its source tag. */
export function FactLine({ fact }: { fact: Fact }) {
  return (
    <span>
      {fact.text} <SourceTag source={fact.source} />
    </span>
  );
}

export function Panel({
  title,
  icon,
  right,
  children,
  className = '',
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel-glow reveal rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur-md ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          {icon}
          {title}
        </h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
