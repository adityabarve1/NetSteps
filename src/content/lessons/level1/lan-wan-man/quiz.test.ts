// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right: 'PAN',
    wrong: { 0: 'A LAN covers', 1: 'A MAN covers', 3: 'A WAN joins' },
  },
  {
    right: 'A MAN, because it is the size of a city',
    wrong: {
      0: 'does have its own LAN',
      2: 'does not make a WAN',
      3: 'does not make it a PAN',
    },
  },
  {
    right: 'It is a network of networks, made of many LANs and WANs',
    wrong: {
      0: 'not one LAN',
      1: 'not one WAN',
      2: 'the web is only one service',
    },
  },
  {
    right: 'It is a private address, used inside a LAN such as a home network',
    wrong: { 1: 'not a public address', 2: 'no separate address range' },
  },
  {
    right: 'The limits are rules of thumb, not an official standard',
    wrong: { 0: 'No country', 1: 'Wi-Fi does not set', 3: 'neither book' },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.2 quiz', () => {
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
    expect(positions).toEqual([2, 1, 3, 0, 2]);
    positions.slice(1).forEach((p, i) => {
      expect(p).not.toBe(positions[i]);
    });
  });

  it('keeps every explanation sentence short (25 words at most)', () => {
    for (const q of quiz) {
      for (const s of sentences(q.explanation)) {
        expect(words(s).length, `${q.id}: "${s}"`).toBeLessThanOrEqual(25);
      }
    }
  });

  it('the number questions agree with the lesson limits', () => {
    // 10 km: above the 2 km LAN limit, below the 100 km MAN limit.
    expect(quiz[1]?.prompt).toContain('about 10 km apart');
    expect(quiz[1]?.explanation).toContain('2 km');
    expect(quiz[1]?.explanation).toContain('100 km');
    expect(quiz[3]?.prompt).toContain('192.168.0.14');
  });
});
