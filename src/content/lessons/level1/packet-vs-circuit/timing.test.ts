// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOPS,
  DEFAULT_KB,
  MAX_HOPS,
  MAX_KB,
  PACKET_BITS,
  RATE_BPS,
  clampHops,
  clampKb,
  clampSetup,
  timingReport,
  verdictText,
} from './timing';
import {
  circuitSwitchingSeconds,
  messageSwitchingSeconds,
  packetSwitchingSeconds,
} from './logic';

describe('timingReport', () => {
  it('uses the three formulas of logic.ts: 8 KB, 3 links, 0.2 s setup', () => {
    const t = timingReport(8, 3, 0.2);
    const bits = 8 * 1000 * 8;
    expect(t.packets).toBe(8);
    expect(t.packet).toBe(
      packetSwitchingSeconds({
        messageBits: bits,
        packetBits: PACKET_BITS,
        hops: 3,
        rateBps: RATE_BPS,
      }),
    );
    expect(t.message).toBe(
      messageSwitchingSeconds({
        messageBits: bits,
        hops: 3,
        rateBps: RATE_BPS,
      }),
    );
    expect(t.circuit).toBe(
      circuitSwitchingSeconds({
        setupSeconds: 0.2,
        messageBits: bits,
        rateBps: RATE_BPS,
      }),
    );
    expect(t.packet).toBeCloseTo(0.08, 9);
    expect(t.message).toBeCloseTo(0.192, 9);
    expect(t.circuit).toBeCloseTo(0.264, 9);
    expect(t.fastest).toEqual(['packet']);
  });

  it('one link: packet and message switching tie, and with no setup so does the circuit', () => {
    expect(timingReport(8, 1, 0).fastest).toEqual([
      'circuit',
      'packet',
      'message',
    ]);
    expect(timingReport(8, 1, 0.2).fastest).toEqual(['packet', 'message']);
  });

  it('with no setup the circuit wins over several links (no store-and-forward delay)', () => {
    expect(timingReport(20, 5, 0).fastest).toEqual(['circuit']);
  });

  it('a long setup makes the circuit slowest for a small message', () => {
    const t = timingReport(1, 4, 3);
    expect(t.circuit).toBeGreaterThan(t.packet);
    expect(t.circuit).toBeGreaterThan(t.message);
  });

  it('never returns NaN or Infinity for hostile input', () => {
    for (const bad of [NaN, Infinity, -Infinity, -5, 0, 1e9]) {
      const t = timingReport(bad, bad, bad);
      for (const v of [t.circuit, t.packet, t.message]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe('clamps', () => {
  it('keep whole numbers inside the slider ranges', () => {
    expect(clampKb(0)).toBe(1);
    expect(clampKb(10_000)).toBe(MAX_KB);
    expect(clampKb(7.6)).toBe(8);
    expect(clampHops(0)).toBe(1);
    expect(clampHops(99)).toBe(MAX_HOPS);
    expect(clampHops(2.4)).toBe(2);
  });

  it('give the defaults for numbers that are not finite', () => {
    expect(clampKb(NaN)).toBe(DEFAULT_KB);
    expect(clampHops(Infinity)).toBe(DEFAULT_HOPS);
    expect(clampSetup(NaN)).toBe(0.2);
  });

  it('keep the setup between 0 and 3 seconds', () => {
    expect(clampSetup(-1)).toBe(0);
    expect(clampSetup(50)).toBe(3);
    expect(clampSetup(1)).toBe(1);
  });
});

describe('verdictText', () => {
  it('names the single fastest way and its time', () => {
    expect(verdictText(timingReport(8, 3, 0.2))).toMatch(
      /^Fastest here: packet switching/,
    );
  });

  it('names a tie in words', () => {
    expect(verdictText(timingReport(8, 1, 0.2))).toMatch(
      /packet switching and message switching tie/,
    );
  });
});
