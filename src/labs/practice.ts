// Pure logic for auto-checked practice problems. No React, no clock, no
// Math.random: every problem comes from a seeded random number generator, so
// the same seed always gives the same problems.

export type Problem = {
  id: string;
  prompt: string;
  answer: number;
  /** An answer within this distance of `answer` counts as correct. */
  tolerance: number;
  unit?: string;
  explanation: string;
  params: Record<string, number>;
};

export type Rng = () => number;

const UINT32 = 4294967296;

// Any seed becomes an unsigned 32-bit integer. Anything that is not a finite
// number (NaN, Infinity, a string, undefined) becomes 0; fractions are cut off.
function normaliseSeed(seed: unknown): number {
  if (typeof seed !== 'number' || !Number.isFinite(seed)) return 0;
  return Math.trunc(seed) >>> 0;
}

/**
 * A small deterministic generator (mulberry32). Returns numbers in [0, 1):
 * never 1, never NaN. The same seed gives the same sequence. Hostile seeds
 * never throw: see `normaliseSeed`. A seed of 1.5 behaves like 1.
 */
export function createRng(seed: number): Rng {
  let state = normaliseSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
}

/** The seed for run number `run` of a lab: run 0 keeps the base seed. */
export function sessionSeed(base: number, run: number): number {
  return (
    (normaliseSeed(base) + Math.imul(normaliseSeed(run), 0x9e3779b9)) >>> 0
  );
}

export const DEFAULT_COUNT = 5;
export const MAX_COUNT = 20;

/** How many problems a session has: a whole number from 1 to 20, default 5. */
export function normaliseCount(count: number | undefined): number {
  if (typeof count !== 'number' || !Number.isInteger(count))
    return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(1, count));
}

/**
 * Seconds to send `sizeMB` megabytes at `mbps` megabits per second: size x 8 /
 * speed. There is no latency in this sum.
 * @throws {RangeError} if either number is not finite, the size is negative or
 * the speed is not above zero.
 */
export function transferSeconds(sizeMB: number, mbps: number): number {
  if (!Number.isFinite(sizeMB) || sizeMB < 0) {
    throw new RangeError('File size must be zero or more megabytes.');
  }
  if (!Number.isFinite(mbps) || mbps <= 0) {
    throw new RangeError('Speed must be more than zero megabits per second.');
  }
  return (sizeMB * 8) / mbps;
}

/**
 * The value of a string of 1 to 32 binary digits. Leading zeros are fine.
 * Uses multiplication, not bit shifts, so 32 ones is exactly 4294967295.
 * @throws {RangeError} for anything that is not 1 to 32 characters of 0 or 1.
 */
export function binaryToDecimal(bits: string): number {
  if (typeof bits !== 'string' || !/^[01]{1,32}$/.test(bits)) {
    throw new RangeError('Use 1 to 32 binary digits (0 or 1).');
  }
  let value = 0;
  for (const bit of bits) value = value * 2 + (bit === '1' ? 1 : 0);
  return value;
}

const pick = <T>(list: readonly T[], rng: Rng): T => {
  const item = list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  if (item === undefined)
    throw new RangeError('Cannot pick from an empty list.');
  return item;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const SIZES_MB = [5, 10, 20, 25, 40, 50, 80, 100, 200, 250, 400, 500] as const;
const SPEEDS_MBPS = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100] as const;

// Every size/speed pair whose answer is between 0.5 and 2000 seconds. Built
// once from the lists above, so no problem needs a retry. Every answer has at
// most two decimals because every speed in the list divides size x 8 cleanly.
const TRANSFER_PAIRS: readonly { sizeMB: number; mbps: number }[] =
  SIZES_MB.flatMap((sizeMB) =>
    SPEEDS_MBPS.map((mbps) => ({ sizeMB, mbps })),
  ).filter(({ sizeMB, mbps }) => {
    const seconds = transferSeconds(sizeMB, mbps);
    return seconds >= 0.5 && seconds <= 2000;
  });

/** "How long does this download take?" The answer is in seconds. */
export function generateTransferTime(rng: Rng): Problem {
  const { sizeMB, mbps } = pick(TRANSFER_PAIRS, rng);
  const answer = round2(transferSeconds(sizeMB, mbps));
  const size = String(sizeMB);
  const speed = String(mbps);
  const megabits = String(sizeMB * 8);
  const seconds = String(answer);
  return {
    id: `transfer-${size}mb-${speed}mbps`,
    prompt: `A file is ${size} megabytes (MB). Your connection runs at ${speed} megabits per second (Mbps). How many seconds does the download take? Ignore delays and give your answer in seconds.`,
    answer,
    tolerance: 0.01,
    unit: 'seconds',
    explanation: `1 byte is 8 bits, so ${size} MB is ${megabits} megabits. ${megabits} megabits divided by ${speed} megabits per second is ${seconds} ${answer === 1 ? 'second' : 'seconds'}.`,
    params: { sizeMB, mbps },
  };
}

const PLACE_VALUES = [128, 64, 32, 16, 8, 4, 2, 1] as const;

function joinWithAnd(items: readonly number[]): string {
  const last = items[items.length - 1];
  if (items.length < 2 || last === undefined) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${String(last)}`;
}

/** "What is this 8-bit binary number in decimal?" The value is 1 to 255. */
export function generateBinaryDecimal(rng: Rng): Problem {
  const value = 1 + Math.min(254, Math.floor(rng() * 255));
  const bits = value.toString(2).padStart(8, '0');
  const setPlaces = PLACE_VALUES.filter((_, i) => bits[i] === '1');
  const total = String(value);
  const places =
    setPlaces.length === 1
      ? `The only 1 is in the ${setPlaces.join('')} place, so the value is ${total}.`
      : `The 1s are in the ${joinWithAnd(setPlaces)} places, so add them: ${setPlaces.join(' + ')} = ${total}.`;
  return {
    id: `binary-${bits}`,
    prompt: `What is the binary number ${bits} in decimal? Type just the number.`,
    answer: binaryToDecimal(bits),
    tolerance: 0,
    explanation: `From the left, the 8 places are worth 128, 64, 32, 16, 8, 4, 2 and 1. ${places}`,
    params: { value },
  };
}

/** True only for a problem the lab can show and check safely. */
export function isValidProblem(p: unknown): p is Problem {
  if (typeof p !== 'object' || p === null) return false;
  const q = p as Record<string, unknown>;
  const text = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  return (
    text(q.id) &&
    text(q.prompt) &&
    text(q.explanation) &&
    typeof q.answer === 'number' &&
    Number.isFinite(q.answer) &&
    typeof q.tolerance === 'number' &&
    Number.isFinite(q.tolerance) &&
    q.tolerance >= 0 &&
    typeof q.params === 'object' &&
    q.params !== null
  );
}

/**
 * Makes `count` valid problems with unique ids, or null when the generator
 * throws or returns something invalid. A repeat draw is skipped; if the
 * generator runs out of variety, the repeat gets a numbered id instead.
 */
export function buildProblems(
  generate: (rng: Rng) => Problem,
  rng: Rng,
  count: number,
): Problem[] | null {
  const problems: Problem[] = [];
  const ids = new Set<string>();
  const maxDraws = count * 20;
  for (let draws = 1; problems.length < count; draws += 1) {
    let problem: unknown;
    try {
      problem = generate(rng);
    } catch {
      return null;
    }
    if (!isValidProblem(problem)) return null;
    if (!ids.has(problem.id)) {
      ids.add(problem.id);
      problems.push(problem);
    } else if (draws >= maxDraws) {
      let n = 2;
      while (ids.has(`${problem.id}-${String(n)}`)) n += 1;
      const id = `${problem.id}-${String(n)}`;
      ids.add(id);
      problems.push({ ...problem, id });
    }
  }
  return problems;
}

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/** The number the learner typed, or null when it is not a plain number. */
export function parseAnswer(input: string): number | null {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (!NUMBER_PATTERN.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * Checks what the learner typed. Only plain numbers count: "192" and "192.0"
 * are fine; "1e3", "192 Mbps" and "1,000" are not. Never throws, and the
 * message never gives the answer away.
 */
export function checkAnswer(
  p: Problem,
  input: string,
): { correct: boolean; message: string } {
  const value = parseAnswer(input);
  if (value === null) {
    const tooBig =
      typeof input === 'string' && NUMBER_PATTERN.test(input.trim());
    return {
      correct: false,
      message: tooBig
        ? 'That number is far too big. Type a smaller number.'
        : 'Please type just a number, with no units or words.',
    };
  }
  if (Math.abs(value - p.answer) <= p.tolerance + 1e-9) {
    return { correct: true, message: 'Correct. Well done!' };
  }
  return {
    correct: false,
    message: 'Not quite. Check your steps and try again.',
  };
}
