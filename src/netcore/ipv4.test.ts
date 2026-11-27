import { describe, expect, it } from 'vitest';
import { formatIPv4, parseIPv4, parseMask, sameSubnet } from './ipv4';

const MAX = 4294967295;

describe('parseIPv4', () => {
  it('parses a normal address as an unsigned 32-bit number', () => {
    expect(parseIPv4('192.168.1.10')).toBe(3232235786);
    expect(parseIPv4('10.0.0.1')).toBe(167772161);
    expect(parseIPv4('1.2.3.4')).toBe(16909060);
  });

  it('handles the extremes without signed overflow', () => {
    expect(parseIPv4('0.0.0.0')).toBe(0);
    expect(parseIPv4('255.255.255.255')).toBe(MAX);
    expect(parseIPv4('128.0.0.0')).toBe(2147483648);
    expect(parseIPv4('127.255.255.255')).toBe(2147483647);
    expect(parseIPv4('200.1.1.1')).toBeGreaterThan(2 ** 31);
  });

  it('rejects the cases the plan names', () => {
    for (const bad of [
      '256.1.1.1',
      '1.2.3',
      '1.2.3.4.5',
      '01.2.3.4',
      ' 1.2.3.4',
      '',
      'a.b.c.d',
      '1.2.3.-4',
    ]) {
      expect(parseIPv4(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('formatIPv4', () => {
  it('formats known values', () => {
    expect(formatIPv4(3232235786)).toBe('192.168.1.10');
    expect(formatIPv4(0)).toBe('0.0.0.0');
    expect(formatIPv4(MAX)).toBe('255.255.255.255');
    expect(formatIPv4(2147483648)).toBe('128.0.0.0');
  });

  it('round-trips boundary values and a deterministic sweep', () => {
    const values = [0, 1, 255, 256, 65535, 65536, 2147483647, 2147483648, MAX];
    for (let i = 0; i < 4096; i += 1) {
      values.push((i * 1048583) % 4294967296);
    }
    for (const n of values) {
      expect(parseIPv4(formatIPv4(n)), String(n)).toBe(n);
    }
  });

  it('throws a RangeError for anything that is not a 32-bit unsigned integer', () => {
    for (const bad of [NaN, Infinity, -Infinity, -1, 1.5, MAX + 1, 2 ** 40]) {
      expect(() => formatIPv4(bad), String(bad)).toThrow(RangeError);
    }
    expect(() => formatIPv4('1' as unknown as number)).toThrow(RangeError);
    expect(() => formatIPv4(undefined as unknown as number)).toThrow(
      RangeError,
    );
    expect(() => formatIPv4(null as unknown as number)).toThrow(RangeError);
  });
});

describe('parseMask', () => {
  it('accepts dotted and prefix forms, giving the same number', () => {
    expect(parseMask('255.255.255.0')).toBe(4294967040);
    expect(parseMask('/24')).toBe(4294967040);
    expect(parseMask('/0')).toBe(0);
    expect(parseMask('0.0.0.0')).toBe(0);
    expect(parseMask('/32')).toBe(MAX);
    expect(parseMask('255.255.255.255')).toBe(MAX);
    expect(parseMask('/1')).toBe(2147483648);
  });

  it('matches an independent formula for every prefix length', () => {
    for (let k = 0; k <= 32; k += 1) {
      const expected = 2 ** 32 - 2 ** (32 - k);
      expect(parseMask(`/${String(k)}`), `/${String(k)}`).toBe(expected);
      expect(parseMask(formatIPv4(expected)), `dotted /${String(k)}`).toBe(
        expected,
      );
    }
  });

  it('rejects non-contiguous and out-of-range masks', () => {
    for (const bad of [
      '255.0.255.0',
      '0.255.255.255',
      '255.255.255.1',
      '255.255.255.256',
      '255.255.255',
      '/33',
      '/-1',
      '/24.5',
      '/',
      '24',
      '',
    ]) {
      expect(parseMask(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('rejects a leading zero in a prefix (documented: treated as invalid)', () => {
    expect(parseMask('/024')).toBeNull();
    expect(parseMask('/00')).toBeNull();
    expect(parseMask('/08')).toBeNull();
  });

  it('rejects whitespace and non-string input', () => {
    for (const bad of [' /24', '/24 ', '/24\n', '/ 24', ' 255.255.255.0']) {
      expect(parseMask(bad), JSON.stringify(bad)).toBeNull();
    }
    const odd: unknown[] = [undefined, null, 24, {}, []];
    for (const bad of odd) {
      expect(parseMask(bad as string)).toBeNull();
    }
  });
});

describe('sameSubnet', () => {
  const mask24 = 4294967040;
  const ip = (s: string): number => parseIPv4(s) ?? -1;

  it('is true inside a /24 and false outside it', () => {
    expect(sameSubnet(ip('192.168.1.10'), ip('192.168.1.200'), mask24)).toBe(
      true,
    );
    expect(sameSubnet(ip('192.168.1.10'), ip('192.168.2.10'), mask24)).toBe(
      false,
    );
  });

  it('handles addresses above 2^31 (unsigned arithmetic)', () => {
    expect(sameSubnet(ip('200.1.1.1'), ip('200.1.1.2'), mask24)).toBe(true);
    expect(sameSubnet(ip('200.1.1.1'), ip('72.1.1.1'), 4278190080)).toBe(false);
    expect(sameSubnet(ip('255.255.255.255'), ip('255.255.255.254'), MAX)).toBe(
      false,
    );
  });

  it('mask 0 means everything is one subnet; /32 means only the same address', () => {
    expect(sameSubnet(ip('1.2.3.4'), ip('250.9.9.9'), 0)).toBe(true);
    expect(sameSubnet(ip('1.2.3.4'), ip('1.2.3.4'), MAX)).toBe(true);
    expect(sameSubnet(ip('1.2.3.4'), ip('1.2.3.5'), MAX)).toBe(false);
  });

  it('never throws on odd numbers', () => {
    for (const n of [NaN, -1, 1.5, Infinity, 2 ** 40]) {
      expect(typeof sameSubnet(n, 1, mask24)).toBe('boolean');
      expect(typeof sameSubnet(1, 1, n)).toBe('boolean');
    }
  });
});
