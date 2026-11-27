// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  packetSwitchingSeconds,
  messageSwitchingSeconds,
  splitIntoPackets,
} from './logic';
import { quiz } from './quiz';

// For each question: the text of the right option, and for every WRONG
// option a phrase the explanation must use to say why it is wrong.
const KEY: { right: string; wrong: Record<number, string> }[] = [
  {
    right:
      'A path is reserved for the whole conversation before any data is sent',
    wrong: {
      0: 'describe packet switching',
      1: 'is message switching',
      3: 'full mesh',
    },
  },
  {
    right: '4 packets',
    wrong: {
      1: 'would leave 500 bytes behind',
      2: 'a header is part of each packet',
      3: 'Half a packet cannot be sent',
    },
  },
  {
    right: 'Routers can send the remaining packets by the other route',
    wrong: {
      0: 'the packets that arrived are safe',
      1: 'do not wait for a repair',
      2: 'what a circuit needs',
    },
  },
  {
    right: '10 seconds',
    wrong: {
      0: '24 seconds is the time if the whole message is stored',
      2: '8 seconds is the time over a single link',
      3: '11 seconds counts one packet time too many',
    },
  },
  {
    right:
      'Nothing is reserved, so capacity one user leaves idle can carry another user’s packets',
    wrong: {
      0: 'not always faster',
      1: 'do wait in queues',
      3: 'can be dropped',
    },
  },
];

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean);

describe('lesson 1.6 quiz', () => {
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
    expect(positions).toEqual([2, 0, 3, 1, 2]);
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

  it('asks at least two scenario or number questions', () => {
    expect(
      quiz.filter((q) => /\d/.test(q.prompt)).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('the packet-count question matches splitIntoPackets', () => {
    const q = quiz[1];
    expect(q?.prompt).toContain('3500 bytes');
    expect(q?.prompt).toContain('1000 bytes');
    const packets = splitIntoPackets(3500, 1000);
    expect(`${String(packets.length)} packets`).toBe(q?.options[0]);
    // The wrong answers: rounding down, and one extra for the header.
    expect(`${String(Math.floor(3500 / 1000))} packets`).toBe(q?.options[1]);
    expect(`${String(packets.length + 1)} packets`).toBe(q?.options[2]);
  });

  it('the timing question matches the formulas and its wrong answers', () => {
    const q = quiz[3];
    const p = { messageBits: 8000, packetBits: 1000, hops: 3, rateBps: 1000 };
    expect(q?.prompt).toContain('8000 bits');
    expect(q?.prompt).toContain('1000-bit packets');
    expect(q?.prompt).toContain('3 links');
    expect(`${String(packetSwitchingSeconds(p))} seconds`).toBe(q?.options[1]);
    expect(
      `${String(messageSwitchingSeconds({ messageBits: 8000, hops: 3, rateBps: 1000 }))} seconds`,
    ).toBe(q?.options[0]);
    expect(`${String(packetSwitchingSeconds({ ...p, hops: 1 }))} seconds`).toBe(
      q?.options[2],
    );
    expect(`${String(packetSwitchingSeconds(p) + 1)} seconds`).toBe(
      q?.options[3],
    );
    expect(q?.explanation).toContain('(8 + 3 − 1) × 1 second = 10 seconds');
  });
});
