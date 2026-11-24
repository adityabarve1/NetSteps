import { describe, expect, it, vi } from 'vitest';
import { applyAction } from '@/progress/actions';
import type { ProgressAction } from '@/progress/actions';
import { sendWrites } from '@/progress/writes';
import { emptyProgress } from '@/progress/logic';
import type { ProgressStore } from '@/progress/store';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

const open = (id: string, at: string): ProgressAction => ({
  type: 'open',
  id,
  at,
});
const quiz = (
  id: string,
  score: number,
  total: number,
  at = T2,
): ProgressAction => ({
  type: 'quiz',
  id,
  score,
  total,
  at,
});

describe('open', () => {
  it('creates an in-progress record and writes it', () => {
    const { next, writes } = applyAction(emptyProgress(), open('a', T1));
    expect(next.lessons.a).toEqual(opened(T1));
    expect(writes).toEqual([{ kind: 'lesson', id: 'a', record: opened(T1) }]);
  });

  it('writes again when the lesson is opened later (last_opened_at moves)', () => {
    const { next, writes } = applyAction(
      stateOf({ a: opened(T1) }),
      open('a', T2),
    );
    expect(next.lessons.a).toEqual(opened(T2));
    expect(writes).toHaveLength(1);
  });

  it('writes nothing for an older or equal time', () => {
    const state = stateOf({ a: opened(T2) });
    expect(applyAction(state, open('a', T1))).toEqual({
      next: state,
      writes: [],
    });
    expect(applyAction(state, open('a', T2)).writes).toEqual([]);
  });

  it('keeps a completed lesson completed and still records the new open time', () => {
    const { next } = applyAction(stateOf({ a: done(T1) }), open('a', T3));
    expect(next.lessons.a).toEqual({ ...done(T1), lastOpenedAt: T3 });
  });
});

describe('quiz', () => {
  it('records the attempt and the new best, lesson first', () => {
    const { next, writes } = applyAction(
      stateOf({ a: opened(T1) }),
      quiz('a', 4, 5),
    );
    expect(next.lessons.a).toEqual(withQuiz(opened(T1), 4, 5));
    expect(writes).toEqual([
      { kind: 'lesson', id: 'a', record: withQuiz(opened(T1), 4, 5) },
      { kind: 'quiz', id: 'a', score: 4, total: 5, at: T2 },
    ]);
  });

  it('records the attempt but not the lesson when the score is not a new best', () => {
    const state = stateOf({ a: withQuiz(opened(T1), 5, 5) });
    const { next, writes } = applyAction(state, quiz('a', 2, 5));
    expect(next).toBe(state);
    expect(writes).toEqual([
      { kind: 'quiz', id: 'a', score: 2, total: 5, at: T2 },
    ]);
  });

  it('records one attempt per submit, even for the same result', () => {
    const state = stateOf({ a: withQuiz(opened(T1), 4, 5) });
    expect(applyAction(state, quiz('a', 4, 5)).writes).toEqual([
      { kind: 'quiz', id: 'a', score: 4, total: 5, at: T2 },
    ]);
  });

  it('creates the lesson when a quiz is the first thing that happens', () => {
    const { next, writes } = applyAction(emptyProgress(), quiz('a', 3, 5));
    expect(next.lessons.a).toEqual({
      status: 'in_progress',
      lastOpenedAt: T2,
      quizBest: { score: 3, total: 5 },
    });
    expect(writes.map((w) => w.kind)).toEqual(['lesson', 'quiz']);
  });

  it.each([
    ['a score above the total', 9, 5],
    ['a negative score', -1, 5],
    ['a total of zero', 0, 0],
    ['a fractional score', 1.5, 5],
    ['NaN', Number.NaN, 5],
    ['Infinity', Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
  ])('rejects %s: no state change and no write', (_name, score, total) => {
    const state = stateOf({ a: opened(T1) });
    expect(applyAction(state, quiz('a', score, total))).toEqual({
      next: state,
      writes: [],
    });
  });
});

describe('complete', () => {
  it('completes once, with the time of the action', () => {
    const { next, writes } = applyAction(stateOf({ a: opened(T1) }), {
      type: 'complete',
      id: 'a',
      at: T2,
    });
    expect(next.lessons.a).toEqual({
      status: 'completed',
      lastOpenedAt: T1,
      completedAt: T2,
    });
    expect(writes).toEqual([
      { kind: 'lesson', id: 'a', record: next.lessons.a },
    ]);
  });

  it('writes nothing the second time', () => {
    const state = stateOf({ a: done(T1) });
    expect(applyAction(state, { type: 'complete', id: 'a', at: T3 })).toEqual({
      next: state,
      writes: [],
    });
  });
});

describe('labs', () => {
  it('starts a lab once', () => {
    const first = applyAction(emptyProgress(), {
      type: 'startLab',
      id: 'lab-a',
      at: T1,
    });
    expect(first.next.labs['lab-a']).toEqual({ status: 'started' });
    expect(first.writes).toEqual([
      { kind: 'lab', id: 'lab-a', record: { status: 'started' } },
    ]);
    expect(
      applyAction(first.next, { type: 'startLab', id: 'lab-a', at: T2 }).writes,
    ).toEqual([]);
  });

  it('completes a lab once and never goes back', () => {
    const first = applyAction(emptyProgress(), {
      type: 'completeLab',
      id: 'lab-a',
      at: T1,
    });
    expect(first.next.labs['lab-a']).toEqual({
      status: 'completed',
      completedAt: T1,
    });
    expect(
      applyAction(first.next, { type: 'completeLab', id: 'lab-a', at: T2 })
        .writes,
    ).toEqual([]);
    expect(
      applyAction(first.next, { type: 'startLab', id: 'lab-a', at: T2 }).next,
    ).toBe(first.next);
  });
});

describe('hostile ids', () => {
  it.each(['__proto__', 'constructor', 'toString'])(
    'treats %s as an ordinary id',
    (id) => {
      const { next, writes } = applyAction(emptyProgress(), open(id, T1));
      expect(Object.keys(next.lessons)).toEqual([id]);
      expect(writes).toEqual([{ kind: 'lesson', id, record: opened(T1) }]);
    },
  );
});

describe('sendWrites', () => {
  function fakeStore() {
    const calls: string[] = [];
    const store: ProgressStore = {
      load: () => Promise.resolve(emptyProgress()),
      saveLesson: (id) => {
        calls.push(`lesson:${id}`);
        return Promise.resolve();
      },
      recordQuizAttempt: (id, score, total) => {
        calls.push(`quiz:${id}:${String(score)}/${String(total)}`);
        return Promise.resolve();
      },
      saveLab: (id) => {
        calls.push(`lab:${id}`);
        return Promise.resolve();
      },
      saveAll: () => Promise.resolve(),
    };
    return { store, calls };
  }

  it('sends each write to the matching store method, in order', () => {
    const { store, calls } = fakeStore();
    sendWrites(store, [
      { kind: 'lesson', id: 'a', record: opened(T1) },
      { kind: 'quiz', id: 'a', score: 3, total: 5, at: T1 },
      { kind: 'lab', id: 'lab-a', record: { status: 'started' } },
    ]);
    expect(calls).toEqual(['lesson:a', 'quiz:a:3/5', 'lab:lab-a']);
  });

  it('never lets a store failure escape, whether it throws or rejects', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const store: ProgressStore = {
      ...fakeStore().store,
      saveLesson: () => Promise.reject(new Error('rejected')),
      saveLab: () => {
        throw new Error('thrown');
      },
    };
    expect(() => {
      sendWrites(store, [
        { kind: 'lesson', id: 'a', record: opened(T1) },
        { kind: 'lab', id: 'lab-a', record: { status: 'started' } },
      ]);
    }).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
