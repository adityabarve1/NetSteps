import { describe, expect, it } from 'vitest';
import {
  bestsFromAttempts,
  labRow,
  lessonRow,
  progressFromRows,
} from '@/progress/rows';
import { done, opened, T1, T2, T3 } from '@/test/progressFixtures';

const U = 'user-1';

describe('lessonRow', () => {
  it('always sends last_opened_at and status, never updated_at', () => {
    expect(lessonRow(U, 'l1-a', opened(T1))).toEqual({
      user_id: U,
      lesson_id: 'l1-a',
      status: 'in_progress',
      last_opened_at: T1,
    });
  });

  it('sends completed_at when the record has one', () => {
    expect(lessonRow(U, 'l1-a', done(T2))).toEqual({
      user_id: U,
      lesson_id: 'l1-a',
      status: 'completed',
      last_opened_at: T2,
      completed_at: T2,
    });
  });

  it('leaves completed_at OUT for a completed record without a time (the trigger fills it)', () => {
    const row = lessonRow(U, 'l1-a', { status: 'completed', lastOpenedAt: T1 });
    expect(row).toEqual({
      user_id: U,
      lesson_id: 'l1-a',
      status: 'completed',
      last_opened_at: T1,
    });
    expect('completed_at' in row).toBe(false);
  });

  it('never sends the quiz score (it is not a lesson_progress column)', () => {
    const row = lessonRow(U, 'l1-a', {
      ...opened(T1),
      quizBest: { score: 5, total: 5 },
    });
    expect(Object.keys(row).sort()).toEqual([
      'last_opened_at',
      'lesson_id',
      'status',
      'user_id',
    ]);
  });
});

describe('labRow', () => {
  it('maps a started lab without a time', () => {
    expect(labRow(U, 'lab-a', { status: 'started' })).toEqual({
      user_id: U,
      lab_id: 'lab-a',
      status: 'started',
    });
  });

  it('maps a completed lab with its time, and leaves it out when missing', () => {
    expect(
      labRow(U, 'lab-a', { status: 'completed', completedAt: T1 }),
    ).toEqual({
      user_id: U,
      lab_id: 'lab-a',
      status: 'completed',
      completed_at: T1,
    });
    expect('completed_at' in labRow(U, 'lab-a', { status: 'completed' })).toBe(
      false,
    );
  });
});

describe('bestsFromAttempts', () => {
  it('keeps the best ratio per lesson, however the attempts are ordered', () => {
    const state = bestsFromAttempts([
      { lesson_id: 'a', score: 2, total: 5, created_at: T1 },
      { lesson_id: 'a', score: 4, total: 5, created_at: T2 },
      { lesson_id: 'a', score: 3, total: 5, created_at: T3 },
      { lesson_id: 'b', score: 1, total: 2, created_at: T1 },
      { lesson_id: 'b', score: 3, total: 5, created_at: T2 },
    ]);
    expect(state.lessons.a?.quizBest).toEqual({ score: 4, total: 5 });
    expect(state.lessons.b?.quizBest).toEqual({ score: 3, total: 5 });
  });

  it('compares ratios exactly, not as floating point', () => {
    const state = bestsFromAttempts([
      { lesson_id: 'a', score: 3, total: 5, created_at: T1 },
      { lesson_id: 'a', score: 5, total: 10, created_at: T2 },
    ]);
    expect(state.lessons.a?.quizBest).toEqual({ score: 3, total: 5 });
  });

  it('ignores rows that cannot be real attempts', () => {
    const state = bestsFromAttempts([
      null,
      'x',
      { lesson_id: 'a', score: 9, total: 5, created_at: T1 },
      { lesson_id: 'a', score: 1, total: 0, created_at: T1 },
      { lesson_id: 'a', score: 1.5, total: 5, created_at: T1 },
      { lesson_id: 7, score: 1, total: 5, created_at: T1 },
    ]);
    expect(state.lessons).toEqual({});
  });

  it('keeps a score whose time cannot be read, as the oldest attempt', () => {
    const state = bestsFromAttempts([
      { lesson_id: 'b', score: 5, total: 5, created_at: 'not a time' },
      { lesson_id: 'c', score: 2, total: 5 },
    ]);
    expect(state.lessons.b?.quizBest).toEqual({ score: 5, total: 5 });
    expect(state.lessons.c?.quizBest).toEqual({ score: 2, total: 5 });
  });

  it('is empty for anything that is not an array', () => {
    expect(bestsFromAttempts(null).lessons).toEqual({});
    expect(bestsFromAttempts({}).lessons).toEqual({});
  });
});

describe('progressFromRows', () => {
  it('maps lesson, lab and best-attempt rows into a state', () => {
    const state = progressFromRows({
      lessons: [
        {
          lesson_id: 'l1-a',
          status: 'completed',
          last_opened_at: T2,
          completed_at: T3,
        },
        {
          lesson_id: 'l1-b',
          status: 'in_progress',
          last_opened_at: T1,
          completed_at: null,
        },
      ],
      labs: [
        { lab_id: 'lab-a', status: 'completed', completed_at: T3 },
        { lab_id: 'lab-b', status: 'started', completed_at: null },
      ],
      attempts: [
        { lesson_id: 'l1-a', score: 3, total: 5, created_at: T1 },
        { lesson_id: 'l1-a', score: 5, total: 5, created_at: T2 },
      ],
    });
    expect(state).toEqual({
      lessons: {
        'l1-a': {
          status: 'completed',
          lastOpenedAt: T2,
          completedAt: T3,
          quizBest: { score: 5, total: 5 },
        },
        'l1-b': { status: 'in_progress', lastOpenedAt: T1 },
      },
      labs: {
        'lab-a': { status: 'completed', completedAt: T3 },
        'lab-b': { status: 'started' },
      },
    });
  });

  it('does not move last_opened_at to the time of a quiz attempt', () => {
    const state = progressFromRows({
      lessons: [
        {
          lesson_id: 'a',
          status: 'in_progress',
          last_opened_at: T1,
          completed_at: null,
        },
      ],
      labs: [],
      attempts: [{ lesson_id: 'a', score: 5, total: 5, created_at: T3 }],
    });
    expect(state.lessons.a?.lastOpenedAt).toBe(T1);
  });

  it('keeps a quiz score for a lesson that has no progress row', () => {
    const state = progressFromRows({
      lessons: [],
      labs: [],
      attempts: [
        { lesson_id: 'a', score: 4, total: 5, created_at: T1 },
        { lesson_id: 'a', score: 2, total: 5, created_at: T3 },
      ],
    });
    expect(state.lessons.a).toEqual({
      status: 'in_progress',
      lastOpenedAt: T3,
      quizBest: { score: 4, total: 5 },
    });
  });

  it('writes Postgres times (+00:00, microseconds) the way this app writes them', () => {
    const state = progressFromRows({
      lessons: [
        {
          lesson_id: 'a',
          status: 'completed',
          last_opened_at: '2026-03-01T10:00:00.123456+00:00',
          completed_at: '2026-03-01T10:00:00+00:00',
        },
      ],
      labs: [
        {
          lab_id: 'x',
          status: 'completed',
          completed_at: '2026-03-02T09:00:00+02:00',
        },
      ],
      attempts: [],
    });
    expect(state.lessons.a).toEqual({
      status: 'completed',
      lastOpenedAt: '2026-03-01T10:00:00.123Z',
      completedAt: '2026-03-01T10:00:00.000Z',
    });
    expect(state.labs.x?.completedAt).toBe('2026-03-02T07:00:00.000Z');
  });

  it('survives rows of the wrong shape', () => {
    const state = progressFromRows({
      lessons: [
        null,
        5,
        { lesson_id: 'ok', status: 'in_progress', last_opened_at: T1 },
        { status: 'completed' },
      ],
      labs: 'nope',
      attempts: undefined,
    });
    expect(Object.keys(state.lessons)).toEqual(['ok']);
    expect(state.labs).toEqual({});
  });

  it('keeps a hostile id as an ordinary entry', () => {
    const state = progressFromRows({
      lessons: [
        { lesson_id: '__proto__', status: 'in_progress', last_opened_at: T1 },
      ],
      labs: [],
      attempts: [],
    });
    expect(Object.keys(state.lessons)).toEqual(['__proto__']);
  });
});
