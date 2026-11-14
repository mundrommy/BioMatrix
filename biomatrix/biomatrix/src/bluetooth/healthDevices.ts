/**
 * Connects to standard Bluetooth Low Energy health devices with Web Bluetooth
 * (Chrome and Edge on computers and Android; needs HTTPS or localhost).
 *
 * Supported official Bluetooth SIG services:
 *  - Heart Rate (0x180D)          -> heart rate
 *  - Blood Pressure (0x1810)      -> systolic / diastolic (and pulse, if sent)
 *  - Health Thermometer (0x1809)  -> body temperature
 *  - Pulse Oximeter (0x1822)      -> SpO2 (and pulse)
 *
 * Any device that implements one of these standards works, no special hardware needed.
 */

/* ------------------------------------------------------------------ */
/* Minimal Web Bluetooth types (not yet part of TypeScript's DOM lib)  */
/* ------------------------------------------------------------------ */

interface BtCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BtCharacteristic>;
  stopNotifications?(): Promise<BtCharacteristic>;
}
interface BtService {
  getCharacteristic(uuid: number): Promise<BtCharacteristic>;
}
interface BtServer {
  connected: boolean;
  connect(): Promise<BtServer>;
  disconnect(): void;
  getPrimaryService(uuid: number): Promise<BtService>;
}
export interface BtDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BtServer;
}
interface BtNavigator {
  bluetooth?: {
    requestDevice(options: { filters: { services: number[] }[]; optionalServices?: number[] }): Promise<BtDevice>;
  };
}

/* ------------------------------------------------------------------ */
/* Readings                                                            */
/* ------------------------------------------------------------------ */

/** One value received from a device. Units are already converted to the app's units. */
export type DeviceReading =
  | { kind: 'heartRate'; bpm: number }
  | { kind: 'bloodPressure'; systolic: number; diastolic: number; pulse?: number }
  | { kind: 'temperature'; celsius: number }
  | { kind: 'spo2'; percent: number; pulse?: number };

export type DeviceCapability = 'Heart rate' | 'Blood pressure' | 'Temperature' | 'Blood oxygen';

const SERVICES: { service: number; characteristics: number[]; capability: DeviceCapability }[] = [
  { service: 0x180d, characteristics: [0x2a37], capability: 'Heart rate' },
  { service: 0x1810, characteristics: [0x2a35], capability: 'Blood pressure' },
  { service: 0x1809, characteristics: [0x2a1c], capability: 'Temperature' },
  // Pulse oximeter: continuous and spot-check measurements (a device may offer either)
  { service: 0x1822, characteristics: [0x2a5f, 0x2a5e], capability: 'Blood oxygen' },
];

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as unknown as BtNavigator).bluetooth;
}

/* ------------------------------------------------------------------ */
/* Number formats used by the Bluetooth health standards               */
/* ------------------------------------------------------------------ */

/** IEEE-11073 16-bit SFLOAT: 4-bit exponent, 12-bit mantissa. Returns NaN for special values. */
export function readSFloat(view: DataView, offset: number): number {
  const raw = view.getUint16(offset, true);
  if (raw === 0x07ff || raw === 0x0800 || raw === 0x07fe || raw === 0x0802 || raw === 0x0801) return NaN;
  let mantissa = raw & 0x0fff;
  let exponent = raw >> 12;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x8) exponent -= 0x10;
  return mantissa * 10 ** exponent;
}

/** IEEE-11073 32-bit FLOAT: 8-bit exponent, 24-bit mantissa. Returns NaN for special values. */
export function readFloat32(view: DataView, offset: number): number {
  const raw = view.getUint32(offset, true);
  let mantissa = raw & 0x00ffffff;
  if (mantissa === 0x007fffff || mantissa === 0x00800000 || mantissa === 0x007ffffe || mantissa === 0x00800002) return NaN;
  let exponent = raw >>> 24;
  if (mantissa >= 0x00800000) mantissa -= 0x01000000;
  if (exponent >= 0x80) exponent -= 0x100;
  return mantissa * 10 ** exponent;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Parsers, one per standard characteristic                            */
/* ------------------------------------------------------------------ */

/** Heart Rate Measurement (0x2A37). */
export function parseHeartRate(view: DataView): DeviceReading | null {
  const flags = view.getUint8(0);
  const bpm = flags & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
  return bpm > 0 ? { kind: 'heartRate', bpm } : null;
}

/** Blood Pressure Measurement (0x2A35). kPa values are converted to mm Hg. */
export function parseBloodPressure(view: DataView): DeviceReading | null {
  const flags = view.getUint8(0);
  const toMmHg = flags & 0x01 ? 7.50062 : 1;
  const systolic = readSFloat(view, 1) * toMmHg;
  const diastolic = readSFloat(view, 3) * toMmHg;
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  let offset = 7; // after flags + 3 SFLOATs (systolic, diastolic, mean arterial pressure)
  if (flags & 0x02) offset += 7; // time stamp
  let pulse: number | undefined;
  if (flags & 0x04 && view.byteLength >= offset + 2) {
    const p = readSFloat(view, offset);
    if (Number.isFinite(p)) pulse = Math.round(p);
  }
  return { kind: 'bloodPressure', systolic: Math.round(systolic), diastolic: Math.round(diastolic), pulse };
}

/** Temperature Measurement (0x2A1C). Fahrenheit is converted to Celsius. */
export function parseTemperature(view: DataView): DeviceReading | null {
  const flags = view.getUint8(0);
  let value = readFloat32(view, 1);
  if (!Number.isFinite(value)) return null;
  if (flags & 0x01) value = ((value - 32) * 5) / 9;
  return { kind: 'temperature', celsius: round1(value) };
}

/** PLX Continuous (0x2A5F) and Spot-check (0x2A5E) measurements: SpO2 and pulse come first. */
export function parsePulseOximeter(view: DataView): DeviceReading | null {
  const spo2 = readSFloat(view, 1);
  const pulse = readSFloat(view, 3);
  if (!Number.isFinite(spo2) || spo2 <= 0) return null;
  return { kind: 'spo2', percent: Math.round(spo2), pulse: Number.isFinite(pulse) ? Math.round(pulse) : undefined };
}

const PARSERS: Record<number, (view: DataView) => DeviceReading | null> = {
  0x2a37: parseHeartRate,
  0x2a35: parseBloodPressure,
  0x2a1c: parseTemperature,
  0x2a5f: parsePulseOximeter,
  0x2a5e: parsePulseOximeter,
};

/* ------------------------------------------------------------------ */
/* Connecting                                                          */
/* ------------------------------------------------------------------ */

export interface ConnectedDevice {
  id: string;
  name: string;
  capabilities: DeviceCapability[];
  disconnect: () => void;
}

/**
 * Opens the browser's device picker (only devices offering a supported service are listed),
 * connects, and starts listening. `onReading` is called for every value the device sends.
 */
export async function connectHealthDevice(
  onReading: (reading: DeviceReading, deviceName: string, deviceId: string) => void,
  onDisconnected: (deviceId: string) => void,
): Promise<ConnectedDevice> {
  const bt = (navigator as unknown as BtNavigator).bluetooth;
  if (!bt) throw new Error('unsupported');

  const device = await bt.requestDevice({ filters: SERVICES.map((s) => ({ services: [s.service] })) });
  const server = await device.gatt?.connect();
  if (!server) throw new Error('no_gatt');
  const name = device.name || 'Bluetooth device';

  const capabilities: DeviceCapability[] = [];
  for (const { service, characteristics, capability } of SERVICES) {
    let svc: BtService;
    try {
      svc = await server.getPrimaryService(service);
    } catch {
      continue; // this device does not offer this service
    }
    for (const uuid of characteristics) {
      try {
        const characteristic = await svc.getCharacteristic(uuid);
        characteristic.addEventListener('characteristicvaluechanged', () => {
          const view = characteristic.value;
          if (!view) return;
          try {
            const reading = PARSERS[uuid](view);
            if (reading) onReading(reading, name, device.id);
          } catch {
            // ignore a malformed packet; the next one usually arrives within seconds
          }
        });
        await characteristic.startNotifications();
        if (!capabilities.includes(capability)) capabilities.push(capability);
      } catch {
        // characteristic not offered by this device
      }
    }
  }

  if (capabilities.length === 0) {
    server.disconnect();
    throw new Error('no_supported_data');
  }

  device.addEventListener('gattserverdisconnected', () => onDisconnected(device.id));

  return {
    id: device.id,
    name,
    capabilities,
    disconnect: () => {
      if (device.gatt?.connected) device.gatt.disconnect();
    },
  };
}
