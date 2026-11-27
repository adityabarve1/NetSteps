import { describe, expect, it } from 'vitest';
import {
  completeLab,
  completeLesson,
  emptyProgress,
  openLesson,
  startLab,
  submitQuiz,
} from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import {
  deepFreeze,
  done,
  lessonOf,
  opened,
  stateOf,
  T1,
  T2,
  T3,
} from '@/test/progressFixtures';

describe('emptyProgress', () => {
  it('has no lessons and no labs, and is a fresh object every time', () => {
    expect(emptyProgress()).toEqual({ lessons: {}, labs: {} });
    expect(emptyProgress()).not.toBe(emptyProgress());
  });
});

describe('openLesson', () => {
  it('records an unseen lesson as in progress with its open time', () => {
    const next = openLesson(emptyProgress(), 'a1', T1);
    expect(next.lessons).toEqual({ a1: opened(T1) });
  });

  it('keeps a completed lesson completed and only moves lastOpenedAt on', () => {
    const before = stateOf({
      a1: { ...done(T1), quizBest: { score: 4, total: 5 } },
    });
    const next = openLesson(before, 'a1', T3);
    expect(lessonOf(next, 'a1')).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T1,
      quizBest: { score: 4, total: 5 },
    });
  });

  it('never moves lastOpenedAt backwards, even for an older timestamp', () => {
    const inProgress = stateOf({ a1: opened(T2) });
    expect(lessonOf(openLesson(inProgress, 'a1', T1), 'a1')).toEqual(
      opened(T2),
    );
    const completed = stateOf({ a1: done(T2) });
    expect(lessonOf(openLesson(completed, 'a1', T1), 'a1')).toEqual(done(T2));
  });

  it('compares times as instants, not as text', () => {
    // 10:00 at +05:00 is 05:00Z, which is earlier than 06:00Z.
    const before = stateOf({ a1: opened('2026-03-01T06:00:00Z') });
    const next = openLesson(before, 'a1', '2026-03-01T10:00:00+05:00');
    expect(lessonOf(next, 'a1')?.lastOpenedAt).toBe('2026-03-01T06:00:00Z');
  });

  it('lets a real time replace an unreadable one, never the other way', () => {
    const broken = stateOf({ a1: opened('garbage') });
    expect(lessonOf(openLesson(broken, 'a1', T1), 'a1')?.lastOpenedAt).toBe(T1);
    const good = stateOf({ a1: opened(T1) });
    const next = openLesson(good, 'a1', 'not a time');
    expect(lessonOf(next, 'a1')?.lastOpenedAt).toBe(T1);
  });

  it('leaves other lessons untouched and shares their records', () => {
    const before = stateOf({ a1: opened(T1), a2: done(T1) });
    const next = openLesson(before, 'a1', T2);
    expect(next.lessons.a2).toBe(before.lessons.a2);
  });

  it('returns the very same state when nothing changes', () => {
    const before = stateOf({ a1: opened(T2) });
    expect(openLesson(before, 'a1', T1)).toBe(before);
    expect(openLesson(before, 'a1', T2)).toBe(before);
  });
});

describe('submitQuiz', () => {
  it('creates the lesson record when it is absent', () => {
    const next = submitQuiz(emptyProgress(), 'a1', 3, 5, T1);
    expect(next.lessons).toEqual({
      a1: {
        status: 'in_progress',
        lastOpenedAt: T1,
        quizBest: { score: 3, total: 5 },
      },
    });
  });

  it('keeps the best ratio: 3/5, then 2/5 stays 3/5, then 5/5 wins', () => {
    const first = submitQuiz(emptyProgress(), 'a1', 3, 5, T1);
    const worse = submitQuiz(first, 'a1', 2, 5, T2);
    expect(lessonOf(worse, 'a1')?.quizBest).toEqual({ score: 3, total: 5 });
    const better = submitQuiz(worse, 'a1', 5, 5, T3);
    expect(lessonOf(better, 'a1')?.quizBest).toEqual({ score: 5, total: 5 });
  });

  it('accepts a score of zero', () => {
    const next = submitQuiz(emptyProgress(), 'a1', 0, 5, T1);
    expect(lessonOf(next, 'a1')?.quizBest).toEqual({ score: 0, total: 5 });
  });

  it('compares ratios, not scores, across different totals', () => {
    // 5/10 is a higher score but a lower ratio than 3/5 (0.5 against 0.6).
    const three = submitQuiz(emptyProgress(), 'a1', 3, 5, T1);
    const half = submitQuiz(three, 'a1', 5, 10, T2);
    expect(lessonOf(half, 'a1')?.quizBest).toEqual({ score: 3, total: 5 });
    // 2/2 is a lower score but a higher ratio than 4/5.
    const four = submitQuiz(emptyProgress(), 'a1', 4, 5, T1);
    const full = submitQuiz(four, 'a1', 2, 2, T2);
    expect(lessonOf(full, 'a1')?.quizBest).toEqual({ score: 2, total: 2 });
  });

  it('keeps the existing result on an equal ratio, and the same state', () => {
    const base = submitQuiz(emptyProgress(), 'a1', 3, 5, T1);
    const same = submitQuiz(base, 'a1', 6, 10, T2);
    expect(same).toBe(base);
    expect(lessonOf(same, 'a1')?.quizBest).toEqual({ score: 3, total: 5 });
  });

  it('compares exactly when ratios are too close for floating point', () => {
    const n = Number.MAX_SAFE_INTEGER;
    const lower = submitQuiz(emptyProgress(), 'a1', n - 2, n - 1, T1);
    const higher = submitQuiz(lower, 'a1', n - 1, n, T2);
    expect(lessonOf(higher, 'a1')?.quizBest).toEqual({
      score: n - 1,
      total: n,
    });
  });

  it('does not touch status, completion or lastOpenedAt of a known lesson', () => {
    const before = stateOf({ a1: done(T1) });
    const next = submitQuiz(before, 'a1', 4, 5, T3);
    expect(lessonOf(next, 'a1')).toEqual({
      ...done(T1),
      quizBest: { score: 4, total: 5 },
    });
  });

  it('replaces a hand-edited impossible best with a valid result', () => {
    const before = stateOf({
      a1: { ...opened(T1), quizBest: { score: 9, total: 5 } },
    });
    const next = submitQuiz(before, 'a1', 1, 5, T2);
    expect(lessonOf(next, 'a1')?.quizBest).toEqual({ score: 1, total: 5 });
  });

  it.each([
    ['score above total', 6, 5],
    ['negative score', -1, 5],
    ['zero total', 1, 0],
    ['zero over zero', 0, 0],
    ['negative total', 1, -5],
    ['NaN score', Number.NaN, 5],
    ['NaN total', 3, Number.NaN],
    ['infinite values', Infinity, Infinity],
    ['fractional score', 2.5, 5],
    ['fractional total', 3, 5.5],
    ['unsafe integers', 2 ** 60, 2 ** 61],
  ])('rejects %s: the state comes back unchanged', (_name, score, total) => {
    const empty = emptyProgress();
    expect(submitQuiz(empty, 'a1', score, total, T1)).toBe(empty);
    const before = stateOf({
      a1: { ...opened(T1), quizBest: { score: 1, total: 5 } },
    });
    expect(submitQuiz(before, 'a1', score, total, T2)).toBe(before);
  });
});

describe('completeLesson', () => {
  it('sets completedAt once; a second call keeps the first time', () => {
    const opened1 = openLesson(emptyProgress(), 'a1', T1);
    const first = completeLesson(opened1, 'a1', T2);
    const second = completeLesson(first, 'a1', T3);
    expect(lessonOf(second, 'a1')).toEqual({
      status: 'completed',
      lastOpenedAt: T1,
      completedAt: T2,
    });
    expect(second).toBe(first);
  });

  it('creates the record for a lesson that was never opened', () => {
    const next = completeLesson(emptyProgress(), 'a1', T2);
    expect(next.lessons).toEqual({ a1: done(T2) });
  });

  it('keeps the quiz result and open time of an in-progress lesson', () => {
    const before = stateOf({
      a1: { ...opened(T1), quizBest: { score: 3, total: 5 } },
    });
    expect(lessonOf(completeLesson(before, 'a1', T3), 'a1')).toEqual({
      status: 'completed',
      lastOpenedAt: T1,
      completedAt: T3,
      quizBest: { score: 3, total: 5 },
    });
  });

  it('fills in a missing completedAt on a completed lesson', () => {
    const before = stateOf({ a1: { status: 'completed', lastOpenedAt: T1 } });
    const next = completeLesson(before, 'a1', T2);
    expect(lessonOf(next, 'a1')?.completedAt).toBe(T2);
  });
});

describe('labs', () => {
  it('startLab records a started lab and never downgrades or changes one', () => {
    const started = startLab(emptyProgress(), 'lab-x', T1);
    expect(started.labs).toEqual({ 'lab-x': { status: 'started' } });
    expect(startLab(started, 'lab-x', T2)).toBe(started);
    const finished = completeLab(started, 'lab-x', T2);
    expect(startLab(finished, 'lab-x', T3)).toBe(finished);
  });

  it('completeLab completes a started lab or an unseen one', () => {
    const started = startLab(emptyProgress(), 'lab-x', T1);
    expect(completeLab(started, 'lab-x', T2).labs).toEqual({
      'lab-x': { status: 'completed', completedAt: T2 },
    });
    expect(completeLab(emptyProgress(), 'lab-y', T3).labs).toEqual({
      'lab-y': { status: 'completed', completedAt: T3 },
    });
  });

  it('completeLab keeps the first completion time', () => {
    const first = completeLab(emptyProgress(), 'lab-x', T1);
    const second = completeLab(first, 'lab-x', T3);
    expect(second).toBe(first);
    expect(second.labs['lab-x']).toEqual({
      status: 'completed',
      completedAt: T1,
    });
  });

  it('never changes lessons', () => {
    const before = stateOf({ a1: opened(T1) });
    expect(startLab(before, 'lab-x', T2).lessons).toBe(before.lessons);
    expect(completeLab(before, 'lab-x', T2).lessons).toBe(before.lessons);
  });
});

describe('ids that clash with object internals', () => {
  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'treats %j as an ordinary lesson and lab id',
    (id) => {
      const first = openLesson(emptyProgress(), id, T1);
      expect(Object.keys(first.lessons)).toEqual([id]);
      expect(Object.hasOwn(first.lessons, id)).toBe(true);
      expect(Object.getPrototypeOf(first.lessons)).toBe(Object.prototype);
      expect(lessonOf(first, id)).toEqual(opened(T1));

      const quizzed = submitQuiz(first, id, 3, 5, T2);
      expect(lessonOf(completeLesson(quizzed, id, T3), id)).toEqual({
        status: 'completed',
        lastOpenedAt: T1,
        completedAt: T3,
        quizBest: { score: 3, total: 5 },
      });

      const lab = completeLab(startLab(emptyProgress(), id, T1), id, T2);
      expect(Object.keys(lab.labs)).toEqual([id]);
      expect(lab.labs[id]).toEqual({ status: 'completed', completedAt: T2 });
      expect(({} as Record<string, unknown>).status).toBeUndefined();
    },
  );
});

describe('purity', () => {
  it('never mutates its arguments', () => {
    const state: ProgressState = {
      lessons: {
        a1: { ...done(T1), quizBest: { score: 4, total: 5 } },
        a2: opened(T2),
      },
      labs: { 'lab-x': { status: 'started' } },
    };
    const frozen = deepFreeze(structuredClone(state));
    expect(() => {
      openLesson(frozen, 'a2', T3);
      openLesson(frozen, 'new', T3);
      submitQuiz(frozen, 'a2', 5, 5, T3);
      submitQuiz(frozen, 'new', 5, 5, T3);
      completeLesson(frozen, 'a2', T3);
      completeLesson(frozen, 'new', T3);
      startLab(frozen, 'lab-y', T3);
      completeLab(frozen, 'lab-x', T3);
    }).not.toThrow();
    expect(frozen).toEqual(state);
  });
});
