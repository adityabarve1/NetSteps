import { describe, expect, it } from 'vitest';
import { createRng, sessionSeed } from '@/labs/practice';

const take = (seed: number, n: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng());
};

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(42, 50)).toEqual(take(42, 50));
  });

  it('gives different sequences for different seeds', () => {
    const seen = new Set(
      [0, 1, 2, 3, 42, 1000, 2 ** 31].map((s) => take(s, 5).join()),
    );
    expect(seen.size).toBe(7);
  });

  it('two generators with one seed do not share state', () => {
    const a = createRng(7);
    const b = createRng(7);
    a();
    a();
    expect(b()).toBe(take(7, 1)[0]);
  });

  it('never returns 1, a negative or NaN over 100000 draws', () => {
    const rng = createRng(2024);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 100000; i += 1) {
      const v = rng();
      if (Number.isNaN(v)) throw new Error('NaN draw');
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThan(1);
    // Spread out, not stuck in one corner.
    expect(min).toBeLessThan(0.01);
    expect(max).toBeGreaterThan(0.99);
  });

  it('has a mean near one half', () => {
    const values = take(5, 20000);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['negative', -5],
    ['fractional', 3.7],
    ['huge', 1e300],
    ['beyond 32 bits', 2 ** 40 + 5],
    ['negative zero', -0],
  ])('treats a %s seed deterministically and never throws', (_, seed) => {
    expect(() => createRng(seed)).not.toThrow();
    const first = take(seed, 200);
    expect(take(seed, 200)).toEqual(first);
    for (const v of first) {
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('maps NaN and Infinity to the same sequence as seed 0', () => {
    expect(take(Number.NaN, 5)).toEqual(take(0, 5));
    expect(take(Number.POSITIVE_INFINITY, 5)).toEqual(take(0, 5));
  });

  it('survives values that are not numbers at all', () => {
    const hostile = [
      undefined,
      null,
      '12',
      {},
      [],
      Symbol('x'),
      10n,
    ] as unknown[];
    for (const seed of hostile) {
      const rng = createRng(seed as number);
      expect(rng()).toBeLessThan(1);
    }
  });
});

describe('sessionSeed', () => {
  it('keeps the base seed for the first run and changes it for every later run', () => {
    expect(sessionSeed(123, 0)).toBe(123);
    const seeds = new Set(
      Array.from({ length: 50 }, (_, run) => sessionSeed(123, run)),
    );
    expect(seeds.size).toBe(50);
  });

  it('always returns an unsigned 32-bit integer, even for hostile input', () => {
    for (const [base, run] of [
      [Number.NaN, 3],
      [-1, 1],
      [2 ** 40, 9],
      [5, Number.NaN],
      [5, -2],
    ] as const) {
      const s = sessionSeed(base, run);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2 ** 32);
    }
  });
});
