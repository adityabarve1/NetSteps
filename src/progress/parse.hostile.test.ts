import { describe, expect, it } from 'vitest';
import {
  completeLab,
  completeLesson,
  continueTarget,
  levelProgress,
  mergeProgress,
  openLesson,
  overallProgress,
  startLab,
  submitQuiz,
} from '@/progress/logic';
import { parseProgress } from '@/progress/parse';
import type { CurriculumLevel } from '@/progress/types';
import { T1, T2, T3 } from '@/test/progressFixtures';

const fromJson = (text: string): unknown => JSON.parse(text);

// Wrong-shaped states of every kind a broken localStorage or a bad row could
// produce. Some are partly good, so real records sit next to broken ones.
const hostile: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['a string', 'x'],
  ['a number', 5],
  ['an array', []],
  ['an empty object', {}],
  ['a Map', new Map()],
  ['no labs key', { lessons: {} }],
  ['no lessons key', { labs: {} }],
  ['a null record', { lessons: { a1: null, a2: undefined }, labs: {} }],
  ['tables of the wrong type', { lessons: [], labs: 5 }],
  ['undefined tables', { lessons: undefined, labs: undefined }],
  [
    'wrong field types',
    {
      lessons: {
        a1: { status: 1, lastOpenedAt: {}, quizBest: 'x' },
        a2: {
          status: 'completed',
          lastOpenedAt: T1,
          completedAt: [],
          quizBest: [3, 5],
        },
      },
      labs: { l: { status: 'started', completedAt: 5 }, m: null },
    },
  ],
  [
    'impossible quiz results',
    {
      lessons: {
        a1: {
          status: 'in_progress',
          lastOpenedAt: T1,
          quizBest: { score: 9, total: 5 },
        },
        a2: {
          status: 'in_progress',
          lastOpenedAt: T2,
          quizBest: { score: 0, total: 0 },
        },
        a3: {
          status: 'in_progress',
          lastOpenedAt: T3,
          quizBest: { score: 2.5, total: 5 },
        },
      },
      labs: {},
    },
  ],
  [
    'unreadable times',
    {
      lessons: {
        a1: { status: 'completed', lastOpenedAt: 'garbage', completedAt: T1 },
        a2: {
          status: 'completed',
          lastOpenedAt: T1,
          completedAt: '12/31/9999',
        },
      },
      labs: { l: { status: 'completed', completedAt: 'nope' } },
    },
  ],
  [
    'ids that clash with object internals',
    fromJson(
      `{"lessons":{"__proto__":{"status":"completed","lastOpenedAt":"${T1}","completedAt":"${T2}"},"constructor":{"status":"in_progress","lastOpenedAt":"${T3}"},"toString":{"status":"in_progress","lastOpenedAt":"${T1}"},"":{"status":"in_progress","lastOpenedAt":"${T1}"}},"labs":{"__proto__":{"status":"started"},"constructor":{"status":"completed"}}}`,
    ),
  ],
  [
    'stray fields everywhere',
    {
      lessons: {
        a1: { status: 'in_progress', lastOpenedAt: T1, note: { deep: [1] } },
      },
      labs: { l: { status: 'started', extra: 1 } },
      version: 3,
    },
  ],
  [
    'a good state',
    {
      lessons: {
        a1: { status: 'completed', lastOpenedAt: T2, completedAt: T1 },
      },
      labs: { l: { status: 'started' } },
    },
  ],
];

const rawOf = (name: string): unknown =>
  hostile.find(([hostileName]) => hostileName === name)?.[1];

const level: CurriculumLevel = {
  lessons: ['a1', 'a2', 'a3', '__proto__', 'constructor', 'toString'].map(
    (id) => ({
      id,
      built: true,
    }),
  ),
};
const ids = ['a1', 'a2', '__proto__', 'constructor', 'toString', 'brand-new'];

describe('parseProgress feeds every logic function safely', () => {
  it('has at least 12 hostile inputs', () => {
    expect(hostile.length).toBeGreaterThanOrEqual(12);
  });

  it.each(hostile)(
    '%s: nothing throws, and every result is well-shaped',
    (_name, raw) => {
      const parsed = parseProgress(raw);
      expect(parseProgress(parsed)).toEqual(parsed);
      const results = ids.flatMap((id) => [
        openLesson(parsed, id, T3),
        submitQuiz(parsed, id, 3, 5, T3),
        completeLesson(parsed, id, T3),
        startLab(parsed, id, T3),
        completeLab(parsed, id, T3),
      ]);
      for (const result of results) {
        expect(parseProgress(result)).toEqual(result);
      }
      const target = continueTarget(parsed, [level]);
      expect(target === null || ids.concat('a3').includes(target)).toBe(true);
      const progress = levelProgress(parsed, level);
      expect(progress.done).toBeGreaterThanOrEqual(0);
      expect(progress.done).toBeLessThanOrEqual(progress.total);
      expect(overallProgress(parsed, [level, level])).toEqual({
        done: progress.done * 2,
        total: progress.total * 2,
      });
    },
  );

  it('merges any two hostile inputs without throwing, in either order', () => {
    for (const [nameX, x] of hostile) {
      for (const [nameY, y] of hostile) {
        const px = parseProgress(x);
        const py = parseProgress(y);
        const label = `${nameX} + ${nameY}`;
        const merged = mergeProgress(px, py);
        expect({ label, merged }).toEqual({
          label,
          merged: mergeProgress(py, px),
        });
        expect({ label, merged: parseProgress(merged) }).toEqual({
          label,
          merged,
        });
      }
    }
  });

  it('keeps what is good next to what is broken', () => {
    const good = parseProgress(rawOf('a good state'));
    expect(good.lessons.a1?.status).toBe('completed');
    const mixed = parseProgress(rawOf('wrong field types'));
    expect(mixed.lessons.a2).toEqual({ status: 'completed', lastOpenedAt: T1 });
    expect(mixed.lessons.a1).toBeUndefined();
    expect(mixed.labs).toEqual({ l: { status: 'started' } });
  });
});

describe('parseProgress never throws, even for exotic values', () => {
  it('gives an empty state for a getter that throws', () => {
    const trap = {};
    Object.defineProperty(trap, 'lessons', {
      enumerable: true,
      get: () => {
        throw new Error('boom');
      },
    });
    expect(parseProgress(trap)).toEqual({ lessons: {}, labs: {} });
    const nested = { lessons: { a1: trap }, labs: {} };
    expect(parseProgress(nested)).toEqual({ lessons: {}, labs: {} });
  });

  it('gives an empty state for a revoked proxy', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(parseProgress(proxy)).toEqual({ lessons: {}, labs: {} });
  });
});
