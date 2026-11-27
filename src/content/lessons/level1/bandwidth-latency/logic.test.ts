// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  BANDWIDTH_STEPS,
  advice,
  dominantTitle,
  FILE_CHOICES,
  LATENCY_STEPS,
  bandwidthDelayBits,
  bitsToKilobytes,
  breakdown,
  formatBits,
  formatSeconds,
  throughputMbps,
  totalSeconds,
} from './logic';

describe('totalSeconds', () => {
  it('80 megabits at 10 Mbps with 50 ms latency is 8.05 seconds', () => {
    expect(totalSeconds({ fileMb: 80, bandwidthMbps: 10, latencyMs: 50 })).toBe(
      8.05,
    );
  });

  it('a tiny file on a fast link is dominated by the latency', () => {
    const t = totalSeconds({
      fileMb: 0.001,
      bandwidthMbps: 1000,
      latencyMs: 100,
    });
    expect(t).toBeCloseTo(0.100001, 9);
    expect(t).toBeGreaterThan(0.1);
  });

  it('an empty file still waits for the latency; zero latency is allowed', () => {
    expect(totalSeconds({ fileMb: 0, bandwidthMbps: 5, latencyMs: 200 })).toBe(
      0.2,
    );
    expect(totalSeconds({ fileMb: 10, bandwidthMbps: 5, latencyMs: 0 })).toBe(
      2,
    );
  });

  it('doubling the bandwidth halves only the transfer part', () => {
    const a = totalSeconds({ fileMb: 80, bandwidthMbps: 10, latencyMs: 50 });
    const b = totalSeconds({ fileMb: 80, bandwidthMbps: 20, latencyMs: 50 });
    expect(b).toBeCloseTo(4.05, 10);
    expect(a - b).toBeCloseTo(4, 10);
  });

  it('throws RangeError for zero or negative bandwidth', () => {
    expect(() =>
      totalSeconds({ fileMb: 1, bandwidthMbps: 0, latencyMs: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      totalSeconds({ fileMb: 1, bandwidthMbps: -5, latencyMs: 1 }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for a negative latency or a negative file', () => {
    expect(() =>
      totalSeconds({ fileMb: 1, bandwidthMbps: 1, latencyMs: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      totalSeconds({ fileMb: -1, bandwidthMbps: 1, latencyMs: 1 }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for NaN and Infinity in every field', () => {
    const ok = { fileMb: 1, bandwidthMbps: 1, latencyMs: 1 };
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(() => totalSeconds({ ...ok, fileMb: bad })).toThrow(RangeError);
      expect(() => totalSeconds({ ...ok, bandwidthMbps: bad })).toThrow(
        RangeError,
      );
      expect(() => totalSeconds({ ...ok, latencyMs: bad })).toThrow(RangeError);
    }
  });
});

describe('bandwidthDelayBits', () => {
  it('100 Mbps with a 20 ms round trip holds 2,000,000 bits', () => {
    expect(bandwidthDelayBits(100, 20)).toBe(2_000_000);
  });

  it('1 Mbps for one second is 1,000,000 bits; a zero round trip holds none', () => {
    expect(bandwidthDelayBits(1, 1000)).toBe(1_000_000);
    expect(bandwidthDelayBits(100, 0)).toBe(0);
  });

  it('throws RangeError for bandwidth 0 or below, a negative rtt, NaN or Infinity', () => {
    expect(() => bandwidthDelayBits(0, 20)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(-1, 20)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(100, -1)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(Number.NaN, 20)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(100, Number.NaN)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(Infinity, 20)).toThrow(RangeError);
    expect(() => bandwidthDelayBits(100, Infinity)).toThrow(RangeError);
  });
});

describe('breakdown', () => {
  it('splits 8.05 seconds into 0.05 waiting and 8 sending, bandwidth-dominated', () => {
    const b = breakdown({ fileMb: 80, bandwidthMbps: 10, latencyMs: 50 });
    expect(b.latencySeconds).toBeCloseTo(0.05, 12);
    expect(b.transferSeconds).toBe(8);
    expect(b.totalSeconds).toBe(8.05);
    expect(b.latencyShare).toBeCloseTo(0.05 / 8.05, 12);
    expect(b.dominant).toBe('bandwidth');
  });

  it('a 1-kilobyte request at 1000 Mbps with 100 ms is latency-dominated', () => {
    const b = breakdown({ fileMb: 0.008, bandwidthMbps: 1000, latencyMs: 100 });
    expect(b.dominant).toBe('latency');
    expect(b.latencyShare).toBeGreaterThan(0.99);
  });

  it('is balanced when the two parts are close, and at the 40% and 60% edges', () => {
    // 1 s of latency and 1 s of sending: 50%.
    expect(
      breakdown({ fileMb: 10, bandwidthMbps: 10, latencyMs: 1000 }).dominant,
    ).toBe('balanced');
    // Exactly 60% latency (1.5 s of 2.5 s) counts as latency-dominated.
    expect(
      breakdown({ fileMb: 10, bandwidthMbps: 10, latencyMs: 1500 }).dominant,
    ).toBe('latency');
    // Exactly 40% latency (1 s of 2.5 s) counts as bandwidth-dominated.
    expect(
      breakdown({ fileMb: 15, bandwidthMbps: 10, latencyMs: 1000 }).dominant,
    ).toBe('bandwidth');
  });

  it('zero file and zero latency gives zero time and is balanced', () => {
    const b = breakdown({ fileMb: 0, bandwidthMbps: 1, latencyMs: 0 });
    expect(b.totalSeconds).toBe(0);
    expect(b.latencyShare).toBe(0);
    expect(b.dominant).toBe('balanced');
  });

  it('an empty file with some latency is all latency', () => {
    const b = breakdown({ fileMb: 0, bandwidthMbps: 1, latencyMs: 30 });
    expect(b.latencyShare).toBe(1);
    expect(b.dominant).toBe('latency');
  });

  it('throws the same RangeErrors as totalSeconds', () => {
    expect(() =>
      breakdown({ fileMb: 1, bandwidthMbps: 0, latencyMs: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      breakdown({ fileMb: 1, bandwidthMbps: 1, latencyMs: -1 }),
    ).toThrow(RangeError);
  });
});

describe('formatting', () => {
  it('formats seconds with up to three decimals and no trailing zeros', () => {
    expect(formatSeconds(8.05)).toBe('8.05');
    expect(formatSeconds(80.05)).toBe('80.05');
    expect(formatSeconds(8)).toBe('8');
    expect(formatSeconds(0.100008)).toBe('0.1');
    expect(formatSeconds(0.13)).toBe('0.13');
    expect(formatSeconds(1234.5678)).toBe('1235');
    expect(formatSeconds(0)).toBe('0');
  });

  it('shows a tiny positive time as less than a thousandth', () => {
    expect(formatSeconds(0.00001)).toBe('less than 0.001');
  });

  it('formats bits with thousands separators and converts to kilobytes', () => {
    expect(formatBits(2_000_000)).toBe('2,000,000 bits');
    expect(formatBits(1)).toBe('1 bit');
    expect(bitsToKilobytes(2_000_000)).toBe(250);
  });
});

describe('the try-it choices', () => {
  it('has strictly increasing steps and only valid values', () => {
    for (const list of [BANDWIDTH_STEPS, LATENCY_STEPS]) {
      list.forEach((v, i) => {
        expect(v).toBeGreaterThan(0);
        if (i > 0) expect(v).toBeGreaterThan(list[i - 1] ?? Infinity);
      });
    }
    expect(FILE_CHOICES.length).toBeGreaterThanOrEqual(3);
    for (const f of FILE_CHOICES) {
      expect(f.fileMb).toBeGreaterThan(0);
    }
    expect(new Set(FILE_CHOICES.map((f) => f.id)).size).toBe(
      FILE_CHOICES.length,
    );
  });
});

describe('advice and dominantTitle', () => {
  it('say different things for each kind of wait', () => {
    expect(advice('latency')).toMatch(/wider pipe would barely help/);
    expect(advice('bandwidth')).toMatch(/wider pipe would help a lot/);
    expect(advice('balanced')).toMatch(/improving either one helps/);
    expect(dominantTitle('latency')).toBe('Mostly latency');
    expect(dominantTitle('bandwidth')).toBe('Mostly bandwidth');
    expect(dominantTitle('balanced')).toBe('Balanced');
  });
});

describe('throughputMbps', () => {
  it('80 megabits in 8.05 seconds is about 9.94 Mbps, a bit under the 10 Mbps link', () => {
    expect(
      throughputMbps({ fileMb: 80, bandwidthMbps: 10, latencyMs: 50 }),
    ).toBeCloseTo(80 / 8.05, 10);
  });

  it('a tiny request on a fast link gets a tiny throughput', () => {
    const t = throughputMbps({
      fileMb: 0.008,
      bandwidthMbps: 1000,
      latencyMs: 100,
    });
    expect(t).toBeCloseTo(0.008 / 0.100008, 10);
    expect(t).toBeLessThan(0.1);
  });

  it('with no delay the throughput equals the bandwidth', () => {
    expect(
      throughputMbps({ fileMb: 50, bandwidthMbps: 25, latencyMs: 0 }),
    ).toBe(25);
  });

  it('an empty file has zero throughput, even with zero delay', () => {
    expect(throughputMbps({ fileMb: 0, bandwidthMbps: 25, latencyMs: 0 })).toBe(
      0,
    );
    expect(
      throughputMbps({ fileMb: 0, bandwidthMbps: 25, latencyMs: 10 }),
    ).toBe(0);
  });

  it('throws RangeError for bad input', () => {
    expect(() =>
      throughputMbps({ fileMb: 1, bandwidthMbps: 0, latencyMs: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      throughputMbps({ fileMb: 1, bandwidthMbps: 1, latencyMs: Number.NaN }),
    ).toThrow(RangeError);
  });
});
