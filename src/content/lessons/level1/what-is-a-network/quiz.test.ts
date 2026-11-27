// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right: 'No, because there is no link between them to carry data',
    wrong: { 0: 'same room', 2: 'Wi-Fi', 3: 'three' },
  },
  {
    right: 'A smart TV that streams films',
    wrong: { 0: 'switch', 1: 'router', 2: 'access point' },
  },
  {
    right:
      'No, an ordinary computer does not pass on messages meant for other devices',
    wrong: { 0: 'will not pass', 1: 'same subnet' },
  },
  {
    right: '192.168.1.200',
    wrong: { 0: '192.168.2.10', 2: '10.168.1.10', 3: '192.169.1.10' },
  },
  {
    right:
      'The phone’s Wi-Fi link to the home router box works, but the connection from your home to the internet is down',
    wrong: { 1: 'bars are not wrong', 2: 'cable', 3: 'the web is one service' },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.1 quiz', () => {
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
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
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

  it('the subnet question counts its matching last numbers correctly', () => {
    const q = quiz[3];
    // Every wrong option ends in .10, the same as 192.168.1.10.
    const wrong = q?.options.filter((_, j) => j !== q.correctIndex) ?? [];
    expect(wrong.every((o) => o.endsWith('.10'))).toBe(true);
    expect(q?.explanation).toContain('matches in all three');
    expect(q?.explanation).not.toContain('two of them');
  });
});
