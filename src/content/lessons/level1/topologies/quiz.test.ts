// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { communicatingNodes, makeTopology } from './logic';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right: 'A, B, D and E, but not C',
    wrong: {
      0: 'none can talk is wrong',
      2: 'C has no cable left',
      3: 'no other route',
    },
  },
  {
    right:
      'No device can talk to another, because messages cannot get past the break',
    wrong: {
      0: 'beside the cut',
      1: 'no spare cable',
      2: 'the mesh, not the ring',
    },
  },
  {
    right: '15',
    wrong: { 1: 'counts every cable twice', 2: 'star', 3: 'to itself' },
  },
  {
    right: 'Yes, because the backbone is still whole and D only removes itself',
    wrong: { 0: 'does not block the cable', 1: 'do not pass through' },
  },
  {
    right: 'A star, and the router in the middle',
    wrong: { 0: 'not a bus', 2: 'not a ring', 3: 'not a mesh' },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.3 quiz', () => {
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
    expect(quiz.map((q) => q.correctIndex)).toEqual([1, 3, 0, 2, 1]);
    const positions = quiz.map((q) => q.correctIndex);
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

  it('has no word the style guide bans', () => {
    const banned =
      /\b(simply|just|obviously|easy|of course|clearly|basically)\b/i;
    for (const q of quiz) {
      expect(`${q.prompt} ${q.options.join(' ')} ${q.explanation}`).not.toMatch(
        banned,
      );
    }
  });

  it('the scenario answers agree with communicatingNodes', () => {
    const star = makeTopology('star', 6);
    // Computer C is n3 (the hub n0 is the switch, A is n1).
    expect(communicatingNodes(star, { links: ['n0-n3'], nodes: [] })).toEqual([
      'n0',
      'n1',
      'n2',
      'n4',
      'n5',
    ]);
    const ring = makeTopology('ring', 5);
    expect(communicatingNodes(ring, { links: ['n1-n2'], nodes: [] })).toEqual(
      [],
    );
    const bus = makeTopology('bus', 5);
    // D is n3: A (n0) and E (n4) are both still in the group.
    const group = communicatingNodes(bus, { links: [], nodes: ['n3'] });
    expect(group).toContain('n0');
    expect(group).toContain('n4');
    expect(group).not.toContain('n3');
  });

  it('the cable-count question matches the formula', () => {
    const q = quiz[2];
    expect(makeTopology('mesh', 6).links).toHaveLength(15);
    expect(q?.options[q.correctIndex]).toBe(
      String(makeTopology('mesh', 6).links.length),
    );
    expect(q?.explanation).toContain('6 × 5 = 30');
    expect(q?.explanation).toContain('30 / 2 = 15');
  });
});
