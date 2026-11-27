// The steps of the primary simulation. Pure TypeScript: no React. Every time
// comes from the formulas in logic.ts, so the pictures, captions and theory
// agree. Sizes are megabits, rates megabits per second, delays milliseconds.

import {
  breakdown,
  formatSeconds,
  type Breakdown,
  type TransferParams,
} from './logic';

export type TransferStep = TransferParams & {
  b: Breakdown;
  caption: string;
  /** Text alternative for the picture. */
  label: string;
};

const BIG_FILE_MB = 80; // 10 megabytes
const TINY_FILE_MB = 0.008; // 1 kilobyte

function step(p: TransferParams, caption: string): TransferStep {
  const b = breakdown(p);
  const file =
    p.fileMb === TINY_FILE_MB
      ? 'a 1-kilobyte request'
      : `a file of ${String(p.fileMb)} megabits`;
  return {
    ...p,
    b,
    caption,
    label: `Diagram: ${file} crosses a pipe that carries ${String(p.bandwidthMbps)} megabits per second, over a road with ${String(p.latencyMs)} milliseconds of delay. Sending takes ${formatSeconds(b.transferSeconds)} seconds, the delay is ${formatSeconds(b.latencySeconds)} seconds, and the total is ${formatSeconds(b.totalSeconds)} seconds.`,
  };
}

/** Widen the pipe, shorten the road, and see which one pays off. */
export function transferSteps(): TransferStep[] {
  const big = { fileMb: BIG_FILE_MB };
  const tiny = { fileMb: TINY_FILE_MB };
  return [
    step(
      { ...big, bandwidthMbps: 10, latencyMs: 50 },
      'A 10-megabyte file (80 megabits) crosses a link that carries 10 megabits per second, and its first bit takes 50 milliseconds to arrive. Sending takes 80 ÷ 10 = 8 seconds. Add 0.05 seconds of delay and the total is 8.05 seconds.',
    ),
    step(
      { ...big, bandwidthMbps: 100, latencyMs: 50 },
      'Widen the pipe to 100 megabits per second. The road stays the same length. Sending takes 80 ÷ 100 = 0.8 seconds, and the total is 0.85 seconds. Ten times the bandwidth made the transfer almost ten times quicker.',
    ),
    step(
      { ...big, bandwidthMbps: 1000, latencyMs: 50 },
      'Widen it again to 1000 megabits per second. Sending takes 80 ÷ 1000 = 0.08 seconds, but the 0.05 seconds of delay has not changed. The total is 0.13 seconds, and more than a third of it is now waiting.',
    ),
    step(
      { ...big, bandwidthMbps: 10, latencyMs: 10 },
      'Go back to the 10 megabits per second pipe and shorten the road instead: the delay falls from 50 to 10 milliseconds. The total is 8.01 seconds. For a big file a shorter road barely helps, because sending still takes 8 seconds.',
    ),
    step(
      { ...tiny, bandwidthMbps: 1000, latencyMs: 100 },
      'Now send a tiny 1-kilobyte request (0.008 megabits) over a 1000 megabits per second pipe, on a long road with 100 milliseconds of delay. The sending takes a few millionths of a second. The total is 0.1 seconds, and almost all of it is delay.',
    ),
    step(
      { ...tiny, bandwidthMbps: 1000, latencyMs: 20 },
      'Shorten that road to 20 milliseconds. The total is 0.02 seconds, five times quicker, and the pipe did not change at all. A wider pipe could not have done this, because the pipe was never the slow part.',
    ),
    step(
      { ...big, bandwidthMbps: 1000, latencyMs: 10 },
      'Improve both for the big file: a 1000 megabits per second pipe and a 10 millisecond road. Sending takes 0.08 seconds and the delay is 0.01 seconds, so the total is 0.09 seconds. Which one to improve first depends on which part of the wait is bigger.',
    ),
  ];
}
