// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { bandwidthDelayBits, totalSeconds } from './logic';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right:
      'Ping reports the delay of the trip, and a wider pipe does not make the trip shorter',
    wrong: {
      0: 'does not show speed',
      2: 'does not measure upload speed',
      3: 'are different things',
    },
  },
  {
    right: '8.1 seconds',
    wrong: {
      0: 'forgets the delay',
      1: 'treats 100 ms as one second',
      2: 'as if it were 100 seconds',
    },
  },
  {
    right:
      'Each small request is mostly delay: sending a few bits takes almost no time, so the length of the road sets the wait',
    wrong: {
      1: 'More bandwidth would not help',
      2: 'travel at the same speed',
      3: 'many bits at once',
    },
  },
  {
    right: '12.5 megabytes per second',
    wrong: {
      0: 'forgets that a byte has eight bits',
      1: 'multiplies by 8 instead of dividing',
      3: 'divides by 80',
    },
  },
  {
    right: '2,000,000 bits',
    wrong: {
      0: '0.002 seconds',
      2: 'uses 0.2 seconds',
      3: 'not in 20 ms',
    },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.5 quiz', () => {
  it('has exactly 5 questions with unique ids', () => {
    expect(quiz).toHaveLength(5);
    expect(new Set(quiz.map((q) => q.id)).size).toBe(5);
  });

  it.each(quiz.map((q, i) => [q.id, i] as const))(
    '%s: the right option, 3 or 4 distinct options, and an explanation for each wrong one',
    (_id, i) => {
      const q = quiz[i];
      const key = KEY[i];
      if (q === undefined || key === undefined) throw new Error('missing');
      expect(q.options[q.correctIndex]).toBe(key.right);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(new Set(q.options).size).toBe(q.options.length);
      const wrongIndexes = q.options
        .map((_, j) => j)
        .filter((j) => j !== q.correctIndex);
      expect(Object.keys(key.wrong).map(Number)).toEqual(wrongIndexes);
      for (const phrase of Object.values(key.wrong)) {
        expect(q.explanation).toContain(phrase);
      }
    },
  );

  it('spreads the right answers over the positions', () => {
    const positions = quiz.map((q) => q.correctIndex);
    expect(positions).toEqual([1, 3, 0, 2, 1]);
    positions.slice(1).forEach((p, i) => {
      expect(p).not.toBe(positions[i]);
    });
  });

  it('keeps every explanation sentence short (30 words at most)', () => {
    for (const q of quiz) {
      for (const s of sentences(q.explanation)) {
        expect(words(s).length, `${q.id}: "${s}"`).toBeLessThanOrEqual(30);
      }
    }
  });

  it('the total-time question matches the formula and its wrong answers', () => {
    const q = quiz[1];
    const t = totalSeconds({ fileMb: 160, bandwidthMbps: 20, latencyMs: 100 });
    expect(q?.prompt).toContain('160-megabit');
    expect(q?.prompt).toContain('20 Mbps');
    expect(q?.prompt).toContain('100 ms');
    expect(`${String(t)} seconds`).toBe(q?.options[3]);
    // The wrong answers: no delay at all, a delay of 1 s, a delay of 100 s.
    expect(`${String(160 / 20)} seconds`).toBe(q?.options[0]);
    expect(`${String(160 / 20 + 1)} seconds`).toBe(q?.options[1]);
    expect(`${String(160 / 20 + 100)} seconds`).toBe(q?.options[2]);
    expect(q?.explanation).toContain('160 ÷ 20 = 8 seconds');
  });

  it('the units question: 100 Mbps is 12.5 megabytes per second', () => {
    const q = quiz[3];
    expect(q?.prompt).toContain('100 Mbps');
    expect(`${String(100 / 8)} megabytes per second`).toBe(q?.options[2]);
    expect(`${String(100)} megabytes per second`).toBe(q?.options[0]);
    expect(`${String(100 * 8)} megabytes per second`).toBe(q?.options[1]);
    expect(`${String(100 / 80)} megabytes per second`).toBe(q?.options[3]);
    expect(q?.explanation).toContain('100 ÷ 8 = 12.5');
  });

  it('the bandwidth-delay question matches the formula and its wrong answers', () => {
    const q = quiz[4];
    const bits = (rttMs: number) =>
      bandwidthDelayBits(100, rttMs).toLocaleString('en-US');
    expect(q?.prompt).toContain('100 Mbps');
    expect(q?.prompt).toContain('20 ms');
    expect(`${bits(20)} bits`).toBe(q?.options[1]);
    // 2 ms, 200 ms and a whole second.
    expect(`${bits(2)} bits`).toBe(q?.options[0]);
    expect(`${bits(200)} bits`).toBe(q?.options[2]);
    expect(`${bits(1000)} bits`).toBe(q?.options[3]);
    expect(q?.explanation).toContain('100,000,000 × 0.02 = 2,000,000 bits');
  });

  it('the small-request question names the 8 microsecond sending time', () => {
    const q = quiz[2];
    // 1 kilobyte = 8000 bits; at 1000 Mbps that is 8 millionths of a second.
    expect(8000 / 1_000_000_000).toBe(8e-6);
    expect(q?.prompt).toContain('1000 Mbps');
    expect(q?.explanation).toContain('eight millionths of a second');
  });
});
