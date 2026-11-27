// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { overloadChance } from './sharing';

describe('overloadChance', () => {
  it('is about 0.0004 for 35 users, 10 shares and a 10% active share', () => {
    expect(overloadChance(35, 10, 0.1)).toBeCloseTo(0.000424, 5);
  });

  it('is 0 when no more users than shares can ever be active', () => {
    expect(overloadChance(10, 10, 0.5)).toBe(0);
    expect(overloadChance(0, 10, 0.5)).toBe(0);
  });

  it('is 1 when everyone is always active and there are more users than shares', () => {
    expect(overloadChance(11, 10, 1)).toBeCloseTo(1, 12);
  });

  it('is 0 when nobody is ever active', () => {
    expect(overloadChance(50, 10, 0)).toBe(0);
  });

  it('grows with the number of users', () => {
    const a = overloadChance(20, 10, 0.1);
    const b = overloadChance(35, 10, 0.1);
    const c = overloadChance(50, 10, 0.1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('is a probability for every case in a grid', () => {
    for (let n = 0; n <= 60; n += 7) {
      for (const p of [0, 0.05, 0.1, 0.5, 1]) {
        const x = overloadChance(n, 10, p);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    }
  });

  it('throws RangeError for hostile values', () => {
    expect(() => overloadChance(-1, 10, 0.1)).toThrow(RangeError);
    expect(() => overloadChance(1.5, 10, 0.1)).toThrow(RangeError);
    expect(() => overloadChance(NaN, 10, 0.1)).toThrow(RangeError);
    expect(() => overloadChance(10, -1, 0.1)).toThrow(RangeError);
    expect(() => overloadChance(10, 1.5, 0.1)).toThrow(RangeError);
    expect(() => overloadChance(10, 10, 1.1)).toThrow(RangeError);
    expect(() => overloadChance(10, 10, -0.1)).toThrow(RangeError);
    expect(() => overloadChance(10, 10, NaN)).toThrow(RangeError);
    expect(() => overloadChance(1e6, 10, 0.1)).toThrow(RangeError);
  });
});
