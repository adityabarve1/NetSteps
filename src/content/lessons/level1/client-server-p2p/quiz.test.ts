// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LESSON_NUMBERS as N, clientServerSeconds } from './logic';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right: 'Their laptop acts as the server, and your browser is the client',
    wrong: { 0: 'data centre', 2: 'Asking first', 3: 'ordinary computers' },
  },
  {
    right: '80 seconds',
    wrong: {
      0: '16 seconds is the time for one client',
      1: '40 seconds is the time for five clients',
      3: '160 seconds is what twenty clients',
    },
  },
  {
    right:
      'The server is a single point of failure: when it stops, the service stops for everyone',
    wrong: {
      1: 'still work',
      2: 'only passes data along',
      3: 'Too many clients',
    },
  },
  {
    right:
      'Each new peer also uploads, so the total upload available grows with the group',
    wrong: {
      0: 'do not always have faster',
      1: 'still have to download',
      2: 'server’s own connection',
    },
  },
  {
    right: 'A hybrid: servers do some jobs and peers do others',
    wrong: {
      0: 'not pure client-server',
      2: 'not pure peer-to-peer',
      3: 'do not forbid video calls',
    },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.4 quiz', () => {
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
    expect(positions).toEqual([1, 2, 0, 3, 1]);
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

  it('the number question matches the formula and its wrong answers', () => {
    const q = quiz[1];
    const seconds = (clients: number) => clientServerSeconds({ ...N, clients });
    // 80 s is the right answer for the 10 clients in the question.
    expect(q?.prompt).toContain('Ten clients');
    expect(q?.prompt).toContain('800-megabit');
    expect(`${String(seconds(10))} seconds`).toBe(q?.options[2]);
    // Each wrong option is the time for the number of clients the
    // explanation names: 1, 5 and 20.
    expect(`${String(seconds(1))} seconds`).toBe(q?.options[0]);
    expect(`${String(seconds(5))} seconds`).toBe(q?.options[1]);
    expect(`${String(seconds(20))} seconds`).toBe(q?.options[3]);
    expect(q?.explanation).toContain('10 × 800 = 8000');
    expect(q?.explanation).toContain('800 ÷ 50 = 16');
  });
});
