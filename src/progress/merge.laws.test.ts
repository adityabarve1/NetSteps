import { describe, expect, it } from 'vitest';
import { emptyProgress, mergeProgress } from '@/progress/logic';
import type { LessonRecord, ProgressState } from '@/progress/types';
import { done, opened, T1, T2, T3, withQuiz } from '@/test/progressFixtures';

// The merge runs again and again, in either order, across devices and offline
// replays. These laws are what make that safe: commutative, associative and
// idempotent. The states below overlap on purpose, so every merge rule fires
// somewhere. The last two carry hostile values: unreadable times, impossible
// quiz results, one instant written two ways, and stray fields.
const sampleStates: [string, ProgressState][] = [
  ['empty', emptyProgress()],
  [
    'phone',
    {
      lessons: {
        a1: withQuiz(opened(T2), 3, 5),
        a2: done(T3),
        a3: opened(T1),
      },
      labs: {
        'lab-1': { status: 'started' },
        'lab-2': { status: 'completed', completedAt: T2 },
      },
    },
  ],
  [
    'laptop',
    {
      lessons: {
        a1: withQuiz({ ...done(T1), completedAt: T3 }, 6, 10),
        a2: opened('2026-03-03T10:00:00+05:00'),
        b1: done(T2),
      },
      labs: {
        'lab-1': { status: 'completed', completedAt: T3 },
        'lab-2': { status: 'started' },
        'lab-3': { status: 'started' },
      },
    },
  ],
  [
    'tablet',
    {
      lessons: {
        a1: withQuiz({ ...done(T3), completedAt: T2 }, 2, 2),
        a3: withQuiz(done(T2), 4, 5),
        b1: withQuiz(opened(T3), 1, 5),
      },
      labs: { 'lab-3': { status: 'completed', completedAt: T1 } },
    },
  ],
  [
    'edited-1',
    {
      lessons: {
        a1: { ...withQuiz(done('garbage'), 9, 5), lastOpenedAt: 'garbage' },
        a2: withQuiz(opened('2026-03-01T10:00:00+00:00'), 3, 5),
        a3: {
          ...withQuiz(opened('2026-03-01T10:00:00.000Z'), 0, 0),
          extra: 1,
        } as LessonRecord,
      },
      labs: {
        'lab-1': { status: 'completed', completedAt: '12/31/9999' },
        'lab-2': {
          status: 'completed',
          completedAt: '2026-03-02T10:00:00+00:00',
        },
      },
    },
  ],
  [
    'edited-2',
    {
      lessons: {
        a1: withQuiz(opened('another garbage'), -1, 5),
        a2: withQuiz(opened('2026-03-01T10:00:00.000Z'), 6, 10),
        a3: { ...done('garbage'), completedAt: T2, note: 'x' } as LessonRecord,
      },
      labs: { 'lab-2': { status: 'completed', completedAt: T2 } },
    },
  ],
];

// Only states a real device can hold must come back unchanged from merge(s, s).
const realistic = ['empty', 'phone', 'laptop', 'tablet'];
const settle = (s: ProgressState) => mergeProgress(s, emptyProgress());

// Wrapping each result in its label shows which combination failed.
function expectSame(label: string, got: ProgressState, want: ProgressState) {
  expect({ label, merged: got }).toEqual({ label, merged: want });
}

describe('mergeProgress laws', () => {
  it('is commutative: merge(a, b) equals merge(b, a)', () => {
    for (const [nameA, a] of sampleStates) {
      for (const [nameB, b] of sampleStates) {
        expectSame(
          `${nameA} + ${nameB}`,
          mergeProgress(a, b),
          mergeProgress(b, a),
        );
      }
    }
  });

  it('is idempotent: merge(a, a) equals a', () => {
    for (const [name, s] of sampleStates) {
      if (realistic.includes(name)) {
        expectSame(name, mergeProgress(s, s), s);
      } else {
        // Hostile data is tidied by the first merge and then stays put.
        expectSame(name, mergeProgress(s, s), settle(s));
        expectSame(name, mergeProgress(settle(s), settle(s)), settle(s));
      }
    }
  });

  it('is associative: merge(merge(a, b), c) equals merge(a, merge(b, c))', () => {
    for (const [nameA, a] of sampleStates) {
      for (const [nameB, b] of sampleStates) {
        for (const [nameC, c] of sampleStates) {
          expectSame(
            `${nameA} + ${nameB} + ${nameC}`,
            mergeProgress(mergeProgress(a, b), c),
            mergeProgress(a, mergeProgress(b, c)),
          );
        }
      }
    }
  });

  it('is stable when replayed: merging a result into an input changes nothing', () => {
    for (const [nameA, a] of sampleStates) {
      for (const [nameB, b] of sampleStates) {
        const both = mergeProgress(a, b);
        const label = `${nameA} + ${nameB}`;
        expectSame(label, mergeProgress(both, a), both);
        expectSame(label, mergeProgress(b, both), both);
      }
    }
  });
});
