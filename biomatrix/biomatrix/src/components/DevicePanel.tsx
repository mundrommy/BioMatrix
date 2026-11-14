import { Bluetooth, BluetoothConnected, Loader2, Unplug } from 'lucide-react';
import { useState } from 'react';
import { connectHealthDevice, isBluetoothSupported, type ConnectedDevice, type DeviceReading } from '../bluetooth/healthDevices';

interface DevicePanelProps {
  devices: ConnectedDevice[];
  /** Last time each device sent data, by device id. */
  lastSeen: Record<string, string>;
  onConnected: (device: ConnectedDevice) => void;
  onDisconnected: (deviceId: string) => void;
  onReading: (reading: DeviceReading, deviceName: string, deviceId: string) => void;
}

/**
 * "Connect device": links standard Bluetooth health devices (heart-rate strap or watch,
 * blood-pressure cuff, thermometer, pulse oximeter). Their values fill in automatically.
 */
export function DevicePanel({ devices, lastSeen, onConnected, onDisconnected, onReading }: DevicePanelProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported = isBluetoothSupported();

  const connect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const device = await connectHealthDevice(onReading, onDisconnected);
      onConnected(device);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const msg = (err as Error)?.message;
      if (name === 'NotFoundError') setMessage(null); // the user closed the picker
      else if (msg === 'no_supported_data')
        setMessage('This device does not send heart rate, blood pressure, temperature or blood oxygen in the standard Bluetooth format.');
      else if (name === 'SecurityError') setMessage('Bluetooth needs a secure (https) page. Use the online version of BioMatrix.');
      else setMessage('Could not connect. Check that the device is on, nearby and not connected to another app, then try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-sky-400/30 bg-sky-400/5 px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Bluetooth className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">Health devices</p>
          <p className="text-xs text-slate-400">
            Connect a Bluetooth heart-rate monitor, blood-pressure cuff, thermometer or pulse oximeter. Values fill in automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={!supported || busy}
          className="btn-shine flex min-h-10 items-center gap-2 rounded-md border border-sky-300/60 bg-sky-400/20 px-3 text-sm font-semibold text-sky-50 transition hover:-translate-y-0.5 hover:bg-sky-400/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bluetooth className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Connecting...' : 'Connect device'}
        </button>
      </div>

      {!supported && (
        <p className="mt-2 text-xs text-amber-200">
          This browser cannot connect to Bluetooth devices. Use Chrome or Edge on a computer or an Android phone, or enter values by
          hand below.
        </p>
      )}
      {message && (
        <p className="mt-2 text-xs text-amber-200" role="status">
          {message}
        </p>
      )}

      {devices.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Connected devices">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs">
              <BluetoothConnected className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span className="font-semibold text-slate-100">{d.name}</span>
              <span className="text-slate-300">{d.capabilities.join(', ')}</span>
              <span className="text-slate-500">
                {lastSeen[d.id]
                  ? `last value ${new Date(lastSeen[d.id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'waiting for data...'}
              </span>
              <button
                type="button"
                onClick={() => {
                  d.disconnect();
                  onDisconnected(d.id);
                }}
                className="ml-auto flex min-h-8 items-center gap-1 rounded border border-slate-600 px-2 text-slate-300 hover:border-slate-400 hover:text-white"
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
