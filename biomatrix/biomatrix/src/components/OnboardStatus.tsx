import { CloudOff, HardDrive, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface OnboardState {
  /** The browser reports a network connection. */
  online: boolean;
  /** The service worker is active, so the app is saved on this device and opens offline. */
  offlineReady: boolean;
}

/** Tracks the connection and whether the offline copy of the app is ready. */
export function useOnboardStatus(): OnboardState {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [offlineReady, setOfflineReady] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    let alive = true;
    // `ready` resolves once a service worker is active, i.e. after its files are saved.
    navigator.serviceWorker?.ready.then(() => alive && setOfflineReady(true)).catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return { online, offlineReady };
}

/** Header chip: connection state and whether the app is ready to run with no internet. */
export function OnboardStatusChip() {
  const { online, offlineReady } = useOnboardStatus();

  const look = !online
    ? {
        cls: 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100 onboard-pulse',
        icon: <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />,
        text: 'ONBOARD AUTONOMOUS — OFFLINE READY',
        title: 'No internet. Everything runs on this device and your data is saved here. The AI assistant uses the onboard summary.',
      }
    : offlineReady
      ? {
          cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
          icon: <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />,
          text: 'ONLINE · OFFLINE READY',
          title: 'The app is saved on this device and will open with no internet.',
        }
      : {
          cls: 'border-slate-700 bg-slate-900/80 text-slate-300',
          icon: <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />,
          text: 'ONLINE',
          title: 'Online. The offline copy is saved after the first full load of the published app.',
        };

  return (
    <div
      role="status"
      aria-live="polite"
      title={look.title}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide ${look.cls}`}
    >
      {look.icon}
      <span>{look.text}</span>
    </div>
  );
}
