// Pure TypeScript for lesson 1.5: no React. How long does a transfer take when
// both the width of the link (bandwidth) and its delay (latency) count?
//
// Units: file sizes are in MEGABITS (Mb, 8 megabits = 1 megabyte), bandwidth
// in megabits per second (Mbps, 1 Mbps = 1,000,000 bits per second), latency
// in milliseconds. Results are in seconds.
//
// The model is idealised: the latency is the one-way delay before the first
// bit arrives, and the link then carries the file at its full bandwidth. Real
// transfers add protocol overhead, queues and lost data (see the lesson).
//
// Every function throws a RangeError for a number that makes no sense:
// not finite (NaN, Infinity), a negative size or delay, or a bandwidth of 0
// or less.

export type TransferParams = {
  /** File size in megabits. */
  fileMb: number;
  bandwidthMbps: number;
  /** One-way delay in milliseconds. */
  latencyMs: number;
};

export type Dominant = 'latency' | 'bandwidth' | 'balanced';

export type Breakdown = {
  latencySeconds: number;
  transferSeconds: number;
  totalSeconds: number;
  /** latencySeconds / totalSeconds, from 0 to 1 (0 when the total is 0). */
  latencyShare: number;
  dominant: Dominant;
};

// At least this share of the time is delay: "mostly latency".
const LATENCY_MOSTLY = 0.6;
// At most this share is delay: "mostly bandwidth". In between: balanced.
const LATENCY_LITTLE = 0.4;

function checkNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} must be a number of 0 or more (got ${String(value)})`,
    );
  }
}

function checkBandwidth(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `bandwidthMbps must be a number above 0 (got ${String(value)})`,
    );
  }
}

function check(p: TransferParams): void {
  checkNonNegative('fileMb', p.fileMb);
  checkBandwidth(p.bandwidthMbps);
  checkNonNegative('latencyMs', p.latencyMs);
}

/** Seconds until the whole file has arrived: the delay, then the sending. */
export function totalSeconds(p: TransferParams): number {
  check(p);
  return p.latencyMs / 1000 + p.fileMb / p.bandwidthMbps;
}

/**
 * Bits that fit on the link at once: bandwidth times the round-trip time.
 * `rttMs` is the round trip (there and back) in milliseconds.
 */
export function bandwidthDelayBits(
  bandwidthMbps: number,
  rttMs: number,
): number {
  checkBandwidth(bandwidthMbps);
  checkNonNegative('rttMs', rttMs);
  return (bandwidthMbps * 1_000_000 * rttMs) / 1000;
}

/** The total split into its two parts, and which part matters more. */
export function breakdown(p: TransferParams): Breakdown {
  check(p);
  const latencySeconds = p.latencyMs / 1000;
  const transferSeconds = p.fileMb / p.bandwidthMbps;
  const total = latencySeconds + transferSeconds;
  const latencyShare = total === 0 ? 0 : latencySeconds / total;
  let dominant: Dominant = 'balanced';
  if (latencyShare >= LATENCY_MOSTLY) dominant = 'latency';
  else if (latencyShare <= LATENCY_LITTLE && total > 0) dominant = 'bandwidth';
  return {
    latencySeconds,
    transferSeconds,
    totalSeconds: total,
    latencyShare,
    dominant,
  };
}

/** Seconds as text: up to three decimals, no trailing zeros. */
export function formatSeconds(seconds: number): string {
  if (seconds > 0 && seconds < 0.0005) return 'less than 0.001';
  if (seconds >= 1000) return String(Math.round(seconds));
  return String(Number(seconds.toFixed(3)));
}

/** "2,000,000 bits", with the singular for 1. */
export function formatBits(bits: number): string {
  return `${bits.toLocaleString('en-US')} ${bits === 1 ? 'bit' : 'bits'}`;
}

/** Bits as kilobytes (8 bits per byte, 1 KB = 1000 bytes in this course). */
export function bitsToKilobytes(bits: number): number {
  return bits / 8 / 1000;
}

/** Slider positions for the try-it: Mbps and ms, smallest first. */
export const BANDWIDTH_STEPS: readonly number[] = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
];
export const LATENCY_STEPS: readonly number[] = [
  1, 5, 10, 20, 50, 100, 200, 500,
];

export type FileChoice = {
  id: string;
  label: string;
  /** Size in megabits. */
  fileMb: number;
};

/** Sizes for the try-it (megabytes times 8 gives megabits). */
export const FILE_CHOICES: readonly FileChoice[] = [
  { id: 'request', label: 'A web request (1 kilobyte)', fileMb: 0.008 },
  { id: 'photo', label: 'A photo (4 megabytes)', fileMb: 32 },
  { id: 'video', label: 'A short video (100 megabytes)', fileMb: 800 },
  { id: 'update', label: 'A game update (2000 megabytes)', fileMb: 16000 },
];

/** One sentence on what would speed this transfer up. */
export function advice(d: Dominant): string {
  if (d === 'latency') {
    return 'Most of the wait is the delay. A wider pipe would barely help; a shorter road (less latency) would.';
  }
  if (d === 'bandwidth') {
    return 'Most of the wait is moving the data. A wider pipe would help a lot; a shorter road would barely help.';
  }
  return 'Both parts matter about equally here, so improving either one helps.';
}

/** The headline word for the verdict box. */
export function dominantTitle(d: Dominant): string {
  if (d === 'latency') return 'Mostly latency';
  if (d === 'bandwidth') return 'Mostly bandwidth';
  return 'Balanced';
}

/**
 * The rate you actually get over the whole transfer, in megabits per second:
 * the file size divided by the total time. It is at most the bandwidth, and
 * 0 for an empty file.
 */
export function throughputMbps(p: TransferParams): number {
  const total = totalSeconds(p);
  return total === 0 ? 0 : p.fileMb / total;
}
