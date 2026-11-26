// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LESSON_NUMBERS, clientServerSeconds, p2pSeconds } from './logic';
import { distributionSteps } from './steps';

const steps = distributionSteps();

describe('distributionSteps', () => {
  it('has 7 steps: three client-server, three peer-to-peer, one comparison', () => {
    expect(steps.map((s) => [s.mode, s.count])).toEqual([
      ['client-server', 1],
      ['client-server', 5],
      ['client-server', 10],
      ['p2p', 1],
      ['p2p', 5],
      ['p2p', 10],
      ['compare', 10],
    ]);
  });

  it('every step time comes from the pure formulas', () => {
    for (const s of steps) {
      if (s.mode === 'client-server') {
        expect(s.seconds).toBe(
          clientServerSeconds({ ...LESSON_NUMBERS, clients: s.count }),
        );
      } else if (s.mode === 'p2p') {
        expect(s.seconds).toBe(
          p2pSeconds({ ...LESSON_NUMBERS, peers: s.count }),
        );
      } else {
        expect(s.seconds).toBe(
          clientServerSeconds({ ...LESSON_NUMBERS, clients: s.count }),
        );
        expect(s.otherSeconds).toBe(
          p2pSeconds({ ...LESSON_NUMBERS, peers: s.count }),
        );
      }
    }
  });

  it('the times are 16, 40, 80, then 16, 26.7 and 40 seconds', () => {
    expect(steps.map((s) => s.seconds)).toEqual([
      16,
      40,
      80,
      16,
      4000 / 150,
      40,
      80,
    ]);
    expect(steps[6]?.otherSeconds).toBe(40);
  });

  it('names the limit of each step', () => {
    expect(steps.map((s) => s.limit)).toEqual([
      'client download',
      'server upload',
      'server upload',
      'client download',
      'peer upload sharing',
      'peer upload sharing',
      'server upload',
    ]);
  });

  it('every caption states its own time in seconds', () => {
    const shown = ['16', '40', '80', '16', '26.7', '40'];
    shown.forEach((time, i) => {
      expect(steps[i]?.caption).toContain(`${time} seconds`);
    });
    expect(steps[6]?.caption).toContain('80 seconds');
    expect(steps[6]?.caption).toContain('40 seconds');
  });

  it('captions show their sums, in megabits', () => {
    expect(steps[0]?.caption).toContain('800 ÷ 50 = 16');
    expect(steps[1]?.caption).toContain('5 × 800 = 4000');
    expect(steps[2]?.caption).toContain('10 × 800 = 8000');
    expect(steps[4]?.caption).toContain('4000 ÷ (100 + 5 × 10)');
    expect(steps[5]?.caption).toContain('8000 ÷ (100 + 10 × 10) = 40');
  });

  it('every caption is one or two sentences and under 70 words', () => {
    for (const s of steps) {
      const words = s.caption.split(/\s+/).length;
      expect(words, s.caption).toBeLessThanOrEqual(70);
      expect(s.caption.endsWith('.')).toBe(true);
    }
  });

  it('gives each step a distinct picture label', () => {
    const labels = steps.map((s) => s.label);
    expect(new Set(labels).size).toBe(steps.length);
    expect(labels[2]).toMatch(/10 clients/);
    expect(labels[5]).toMatch(/10 peers/);
  });
});
