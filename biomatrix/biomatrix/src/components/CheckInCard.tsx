import { BellRing, CalendarPlus, CheckCircle2, ClipboardCheck, Clock, Save } from 'lucide-react';
import { METRICS, type MetricId } from '../data/spaceHealthEngine';

/** A reminder to measure one indicator again, created when a check-in is saved. */
export interface Reminder {
  metric: MetricId;
  /** When the reminder becomes due, ISO string. */
  due: string;
}

interface CheckInCardProps {
  /** Time of today's saved check-in, or null if not saved yet. */
  savedAt: string | null;
  reminders: Reminder[];
  now: Date;
  /** Today's date and the date the next save goes to (YYYY-MM-DD). */
  today: string;
  saveDate: string;
  /** Earliest date that can be logged (the mission start). */
  minDate: string;
  /** Dates that already have a saved check-in. */
  savedDates: string[];
  onSaveDateChange: (date: string) => void;
  onSave: () => void;
  onDismiss: (metric: MetricId) => void;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Daily check-in status, the save button and in-app reminders
 * (daily check-in due, and "measure again" reminders for out-of-range values).
 */
export function CheckInCard({
  savedAt,
  reminders,
  now,
  today,
  saveDate,
  minDate,
  savedDates,
  onSaveDateChange,
  onSave,
  onDismiss,
}: CheckInCardProps) {
  const pastDay = saveDate !== today;
  const pastDayLabel = new Date(`${saveDate}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const due = reminders.filter((r) => new Date(r.due) <= now);
  const upcoming = reminders.filter((r) => new Date(r.due) > now).sort((a, b) => a.due.localeCompare(b.due));

  return (
    <section className="panel-glow reveal rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur-md" aria-label="Daily check-in">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {savedAt ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
        ) : (
          <ClipboardCheck className="h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Daily check-in</p>
          {pastDay ? (
            <p className="text-sm text-sky-100">
              Logging a missed day: the values below will be saved for <span className="font-semibold">{pastDayLabel}</span>
              {savedDates.includes(saveDate) ? ' (this replaces the check-in already saved for that day).' : '.'}
            </p>
          ) : savedAt ? (
            <p className="text-sm text-slate-100">Saved today at {timeOf(savedAt)}. Change any value and save again to update it.</p>
          ) : (
            <p className="text-sm text-amber-100">
              Today&apos;s check-in is not saved yet. Measure your values below (fasting glucose and temperature before breakfast), then save.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          className="btn-shine flex min-h-11 items-center gap-2 rounded-md border border-sky-300/60 bg-sky-400/20 px-4 text-sm font-semibold text-sky-50 shadow-md shadow-sky-950/50 transition hover:-translate-y-0.5 hover:bg-sky-400/30 active:translate-y-0"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {pastDay ? `Save for ${pastDayLabel}` : savedAt ? 'Update check-in' : 'Save check-in'}
        </button>
      </div>

      {/* Log a missed day */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        <CalendarPlus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <label className="flex items-center gap-2">
          Check-in date
          <input
            type="date"
            value={saveDate}
            min={minDate}
            max={today}
            onChange={(e) => e.target.value && onSaveDateChange(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 font-mono text-xs text-slate-100"
          />
        </label>
        {pastDay ? (
          <button type="button" onClick={() => onSaveDateChange(today)} className="min-h-8 rounded px-2 text-sky-300 hover:text-sky-100">
            Back to today
          </button>
        ) : (
          <span>Missed a day? Pick its date to log it.</span>
        )}
      </div>

      {(due.length > 0 || upcoming.length > 0) && (
        <div className="space-y-2 border-t border-slate-800 px-4 py-3" role="status" aria-live="polite">
          {due.map((r) => (
            <div key={r.metric} className="reminder-in flex flex-wrap items-center gap-2 rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              <BellRing className="bell-ring h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="flex-1">
                Time to measure <span className="font-semibold">{METRICS[r.metric].label}</span> again.
              </span>
              <button
                type="button"
                onClick={() => onDismiss(r.metric)}
                className="min-h-8 rounded border border-amber-300/50 px-2.5 text-xs font-semibold hover:bg-amber-400/20"
              >
                Done
              </button>
            </div>
          ))}
          {upcoming.map((r) => (
            <p key={r.metric} className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Measure {METRICS[r.metric].label} again at {timeOf(r.due)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
