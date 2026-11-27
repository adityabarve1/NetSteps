// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { totalSeconds } from './logic';
import { transferSteps } from './steps';

const steps = transferSteps();
const at = (i: number) => {
  const s = steps[i];
  if (s === undefined) throw new Error(`no step ${String(i)}`);
  return s;
};

describe('transferSteps', () => {
  it('has seven steps, each with a caption and a picture label', () => {
    expect(steps).toHaveLength(7);
    for (const s of steps) {
      expect(s.caption.length).toBeGreaterThan(40);
      expect(s.label.startsWith('Diagram:')).toBe(true);
    }
  });

  it('every step total comes from totalSeconds', () => {
    for (const s of steps) {
      expect(s.b.totalSeconds).toBe(
        totalSeconds({
          fileMb: s.fileMb,
          bandwidthMbps: s.bandwidthMbps,
          latencyMs: s.latencyMs,
        }),
      );
    }
  });

  it('widening the pipe: 8.05, then 0.85, then 0.13 seconds with the same delay', () => {
    expect(at(0).b.totalSeconds).toBe(8.05);
    expect(at(1).b.totalSeconds).toBeCloseTo(0.85, 12);
    expect(at(2).b.totalSeconds).toBeCloseTo(0.13, 12);
    expect([0, 1, 2].map((i) => at(i).latencyMs)).toEqual([50, 50, 50]);
    expect([0, 1, 2].map((i) => at(i).bandwidthMbps)).toEqual([10, 100, 1000]);
    expect(at(2).caption).toContain('0.13 seconds');
    expect(at(2).caption).toContain('more than a third');
  });

  it('shortening the road for a big file barely helps (8.01 seconds)', () => {
    expect(at(3).bandwidthMbps).toBe(10);
    expect(at(3).latencyMs).toBe(10);
    expect(at(3).b.totalSeconds).toBeCloseTo(8.01, 12);
    expect(at(3).caption).toContain('8.01 seconds');
  });

  it('the tiny request is latency-dominated and a shorter road makes it 5 times quicker', () => {
    expect(at(4).b.dominant).toBe('latency');
    expect(at(4).b.totalSeconds).toBeCloseTo(0.100008, 9);
    expect(at(5).bandwidthMbps).toBe(at(4).bandwidthMbps);
    expect(at(5).b.totalSeconds).toBeCloseTo(0.020008, 9);
    expect(at(4).b.totalSeconds / at(5).b.totalSeconds).toBeGreaterThan(4.9);
    expect(at(5).caption).toContain('five times');
  });

  it('the last step improves both: 0.09 seconds', () => {
    expect(at(6).b.totalSeconds).toBeCloseTo(0.09, 12);
    expect(at(6).caption).toContain('0.09 seconds');
  });

  it('captions only use numbers that match the step', () => {
    expect(at(0).caption).toContain('80 ÷ 10 = 8 seconds');
    expect(at(1).caption).toContain('80 ÷ 100 = 0.8 seconds');
    expect(at(2).caption).toContain('80 ÷ 1000 = 0.08 seconds');
  });
});
