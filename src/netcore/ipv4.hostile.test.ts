import { describe, expect, it } from 'vitest';
import { parseIPv4, parseMask } from './ipv4';

const hostileAddresses = [
  '1.2.3.4\n',
  '\n1.2.3.4',
  '1.2.3.4 ',
  '1.2.3.4\t',
  '1 .2.3.4',
  '1..3.4',
  '1.2.3.04',
  '1.2.3.00',
  '0x1.2.3.4',
  '1.2.3.0x4',
  '١.٢.٣.٤',
  '1.2.3.４',
  '1.2.3.4.',
  '.1.2.3.4',
  '1.2.3.256',
  '999.1.1.1',
  '+1.2.3.4',
  '1.2.3.+4',
  '1e1.2.3.4',
  '1.2.3.4e0',
  '1.2.3.',
  '...',
  '....',
  '1,2,3,4',
  '1.2.3.4/24',
  '1.2.3.1000',
  '１.２.３.４',
  '1.2.3.4\u0000',
  '0.0.0.0.0',
  '-1.2.3.4',
  '1.2.3.4abc',
];

describe('parseIPv4 hostile input', () => {
  it.each(hostileAddresses)('rejects %j', (bad) => {
    expect(parseIPv4(bad)).toBeNull();
  });

  it('returns null for non-string input instead of throwing', () => {
    const odd: unknown[] = [
      undefined,
      null,
      5,
      3232235786,
      true,
      {},
      [],
      () => 1,
    ];
    for (const bad of odd) {
      expect(parseIPv4(bad as string)).toBeNull();
    }
  });

  it('rejects very long strings quickly', () => {
    const started = performance.now();
    for (const long of [
      'a'.repeat(10000),
      '1'.repeat(10000),
      '1.'.repeat(5000),
      '1.2.3.4'.padEnd(10000, ' '),
      '9'.repeat(10000) + '.1.1.1',
    ]) {
      expect(parseIPv4(long)).toBeNull();
      expect(parseMask(long)).toBeNull();
      expect(parseMask('/' + long)).toBeNull();
    }
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('still accepts the valid extremes', () => {
    expect(parseIPv4('0.0.0.0')).toBe(0);
    expect(parseIPv4('255.255.255.255')).toBe(4294967295);
    expect(parseIPv4('0.0.0.1')).toBe(1);
    expect(parseIPv4('10.20.30.40')).toBe(169090600);
  });
});

describe('parseMask hostile input', () => {
  it('applies the strict dotted-quad rules to mask parts', () => {
    for (const bad of [
      '255.255.255.00',
      '255.255.255.0\n',
      '255.255.255.0 ',
      '255.255.255.0.0',
      '255.255..0',
      '٢٥٥.255.255.0',
      '0xff.255.255.0',
    ]) {
      expect(parseMask(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('rejects odd prefixes', () => {
    for (const bad of [
      '/+24',
      '/2e1',
      '/٢٤',
      '//24',
      '/24/',
      '/0x18',
      '/100',
      '/999999999999999999999',
    ]) {
      expect(parseMask(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
