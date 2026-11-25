import { describe, expect, it } from 'vitest';
import { binaryToDecimal, transferSeconds } from '@/labs/practice';

describe('transferSeconds', () => {
  it('is size x 8 / speed with no latency', () => {
    expect(transferSeconds(10, 8)).toBe(10);
    expect(transferSeconds(100, 100)).toBe(8);
    expect(transferSeconds(100, 50)).toBe(16);
    expect(transferSeconds(0, 50)).toBe(0);
    expect(transferSeconds(2.5, 10)).toBe(2);
  });

  it.each([
    ['zero speed', 10, 0],
    ['negative speed', 10, -5],
    ['negative size', -1, 10],
    ['NaN size', Number.NaN, 10],
    ['NaN speed', 10, Number.NaN],
    ['infinite size', Number.POSITIVE_INFINITY, 10],
    ['infinite speed', 10, Number.POSITIVE_INFINITY],
  ])('throws a RangeError for %s', (_, size, mbps) => {
    expect(() => transferSeconds(size, mbps)).toThrow(RangeError);
  });
});

describe('binaryToDecimal', () => {
  it('converts known values', () => {
    expect(binaryToDecimal('11000000')).toBe(192);
    expect(binaryToDecimal('10101010')).toBe(170);
    expect(binaryToDecimal('11111111')).toBe(255);
    expect(binaryToDecimal('0')).toBe(0);
    expect(binaryToDecimal('1')).toBe(1);
  });

  it('allows leading zeros', () => {
    expect(binaryToDecimal('00000001')).toBe(1);
    expect(binaryToDecimal('00001010')).toBe(10);
  });

  it('stays exact for 32 bits', () => {
    expect(binaryToDecimal('1'.repeat(32))).toBe(4294967295);
    expect(binaryToDecimal('1' + '0'.repeat(31))).toBe(2147483648);
    expect(binaryToDecimal('0'.repeat(31) + '1')).toBe(1);
  });

  it.each([
    ['empty', ''],
    ['33 digits', '1'.repeat(33)],
    ['a 2', '10201'],
    ['letters', 'abc'],
    ['spaces', '1 0'],
    ['a sign', '-101'],
    ['a prefix', '0b101'],
    ['a newline', '101\n'],
    ['a decimal point', '1.01'],
  ])('throws a RangeError for %s', (_, bits) => {
    expect(() => binaryToDecimal(bits)).toThrow(RangeError);
  });

  it('throws a RangeError for non-strings', () => {
    for (const bad of [undefined, null, 5, {}] as unknown[]) {
      expect(() => binaryToDecimal(bad as string)).toThrow(RangeError);
    }
  });
});
