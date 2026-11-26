// Pure maths for the try-it "How long does the message take?". No React.
// One fixed link speed and packet size; the learner changes the message size,
// the number of links in a row and the circuit's setup time. The formulas live
// in logic.ts. The model leaves out headers, queueing, loss and the time a
// signal needs to travel, and the lesson says so.

import {
  circuitSwitchingSeconds,
  messageSwitchingSeconds,
  packetSwitchingSeconds,
} from './logic';

export type Method = 'circuit' | 'packet' | 'message';

/** Every link runs at 1 megabit per second. */
export const RATE_BPS = 1_000_000;
/** A packet carries 1000 bytes (8000 bits) of the message. */
export const PACKET_BITS = 8000;

export const MIN_KB = 1;
export const MAX_KB = 50;
export const DEFAULT_KB = 8;
export const MIN_HOPS = 1;
export const MAX_HOPS = 10;
export const DEFAULT_HOPS = 3;
export const MAX_SETUP = 3;
export const DEFAULT_SETUP = 0.2;

function clampWhole(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** A whole number of kilobytes (1 KB = 1000 bytes) from 1 to 50. */
export const clampKb = (n: number) => clampWhole(n, MIN_KB, MAX_KB, DEFAULT_KB);
/** A whole number of links in a row, from 1 to 10. */
export const clampHops = (n: number) =>
  clampWhole(n, MIN_HOPS, MAX_HOPS, DEFAULT_HOPS);
/** Circuit setup time in seconds, from 0 to 3. */
export const clampSetup = (n: number) =>
  Number.isFinite(n) ? Math.min(MAX_SETUP, Math.max(0, n)) : DEFAULT_SETUP;

export type Timing = {
  sizeKB: number;
  hops: number;
  setupSeconds: number;
  packets: number;
  circuit: number;
  packet: number;
  message: number;
  /** Every method whose time is the lowest (more than one means a tie). */
  fastest: Method[];
};

/** The three times for a message. Odd input is clamped, so this never throws. */
export function timingReport(
  sizeKB: number,
  hops: number,
  setupSeconds: number,
): Timing {
  const kb = clampKb(sizeKB);
  const h = clampHops(hops);
  const setup = clampSetup(setupSeconds);
  const messageBits = kb * 1000 * 8;
  const circuit = circuitSwitchingSeconds({
    setupSeconds: setup,
    messageBits,
    rateBps: RATE_BPS,
  });
  const packet = packetSwitchingSeconds({
    messageBits,
    packetBits: PACKET_BITS,
    hops: h,
    rateBps: RATE_BPS,
  });
  const message = messageSwitchingSeconds({
    messageBits,
    hops: h,
    rateBps: RATE_BPS,
  });
  const times: [Method, number][] = [
    ['circuit', circuit],
    ['packet', packet],
    ['message', message],
  ];
  const best = Math.min(circuit, packet, message);
  return {
    sizeKB: kb,
    hops: h,
    setupSeconds: setup,
    packets: messageBits / PACKET_BITS,
    circuit,
    packet,
    message,
    fastest: times.filter(([, t]) => t - best < 1e-9).map(([m]) => m),
  };
}

export const METHOD_NAMES: Record<Method, string> = {
  circuit: 'circuit switching',
  packet: 'packet switching',
  message: 'message switching',
};

/** Seconds with at most three decimals and no trailing zeros: 0.08, 0.264, 10. */
export function formatSeconds(seconds: number): string {
  return String(Math.round(seconds * 1000) / 1000);
}

/** One sentence naming the fastest way, or the tie. */
export function verdictText(t: Timing): string {
  const names = t.fastest.map((m) => METHOD_NAMES[m]);
  const best = formatSeconds(Math.min(t.circuit, t.packet, t.message));
  if (names.length === 1) {
    return `Fastest here: ${names.join('')}, ${best} seconds.`;
  }
  const last = names[names.length - 1] ?? '';
  const list = `${names.slice(0, -1).join(', ')} and ${last}`;
  return `Fastest here: ${list} tie at ${best} seconds.`;
}
