import { describe, expect, it } from 'vitest';
import { completeLesson, levelProgress } from '@/progress/logic';
import { parseProgress } from '@/progress/parse';
import { T1, T2, T3 } from '@/test/progressFixtures';

// Parse one lesson record inside an otherwise empty state.
const lessonFrom = (record: unknown) =>
  parseProgress({ lessons: { x: record }, labs: {} }).lessons.x;
const goodLesson = { status: 'in_progress', lastOpenedAt: T1 };

describe('parseProgress: lesson records', () => {
  it.each([
    ['not an object (null)', null],
    ['not an object (a string)', 'x'],
    ['not an object (a number)', 7],
    ['an array', [goodLesson]],
    ['an array with record fields', Object.assign([], goodLesson)],
    ['a Date with record fields', Object.assign(new Date(), goodLesson)],
    ['no status', { lastOpenedAt: T1 }],
    ['status undefined', { ...goodLesson, status: undefined }],
    ['status a number', { ...goodLesson, status: 1 }],
    ['status null', { ...goodLesson, status: null }],
    ['status an unknown word', { ...goodLesson, status: 'done' }],
    ['status in the wrong case', { ...goodLesson, status: 'COMPLETED' }],
    ['a lab status', { ...goodLesson, status: 'started' }],
    ['no lastOpenedAt', { status: 'in_progress' }],
    ['lastOpenedAt an object', { ...goodLesson, lastOpenedAt: {} }],
    ['lastOpenedAt a number', { ...goodLesson, lastOpenedAt: 5 }],
    ['lastOpenedAt null', { ...goodLesson, lastOpenedAt: null }],
    ['lastOpenedAt plain text', { ...goodLesson, lastOpenedAt: 'garbage' }],
    ['lastOpenedAt a US date', { ...goodLesson, lastOpenedAt: '12/31/9999' }],
    [
      'lastOpenedAt with no time',
      { ...goodLesson, lastOpenedAt: '2026-03-01' },
    ],
    [
      'lastOpenedAt with no zone',
      { ...goodLesson, lastOpenedAt: '2026-03-01T10:00:00' },
    ],
  ])('drops a record: %s', (_name, record) => {
    expect(lessonFrom(record)).toBeUndefined();
  });

  it('keeps a minimal valid record, and both statuses', () => {
    expect(lessonFrom(goodLesson)).toEqual(goodLesson);
    const completed = {
      status: 'completed',
      lastOpenedAt: T1,
      completedAt: T2,
    };
    expect(lessonFrom(completed)).toEqual(completed);
  });

  it('accepts a time written with an offset or a long fraction', () => {
    const times = ['2026-03-01T10:00:00+05:00', '2026-03-01T10:00:00.123456Z'];
    for (const lastOpenedAt of times) {
      expect(lessonFrom({ ...goodLesson, lastOpenedAt })).toEqual({
        ...goodLesson,
        lastOpenedAt,
      });
    }
  });

  it.each([
    ['plain text', 'garbage'],
    ['a number', 5],
    ['an object', {}],
    ['an array', []],
    ['null', null],
    ['an impossible date', '2026-13-45T99:99:99Z'],
  ])(
    'omits a completedAt that is %s but keeps the record',
    (_n, completedAt) => {
      expect(lessonFrom({ ...goodLesson, completedAt })).toEqual(goodLesson);
    },
  );

  // Decision: a completed record whose completedAt is missing or unreadable is
  // KEPT as completed, with no completedAt. Dropping it would lose a real
  // completion, and filling in lastOpenedAt would invent a time. The logic
  // already copes: merge takes a completedAt from the other side if there is
  // one, and completeLesson fills a missing one with the next `at`.
  it.each([
    ['missing', undefined],
    ['unreadable', 'garbage'],
    ['the wrong type', 5],
  ])(
    'keeps a completed lesson whose completedAt is %s',
    (_name, completedAt) => {
      const raw = { status: 'completed', lastOpenedAt: T1, completedAt };
      const parsed = parseProgress({ lessons: { x: raw }, labs: {} });
      expect(parsed.lessons.x).toEqual({
        status: 'completed',
        lastOpenedAt: T1,
      });
      const level = { lessons: [{ id: 'x', built: true }] };
      expect(levelProgress(parsed, level)).toEqual({ done: 1, total: 1 });
      expect(completeLesson(parsed, 'x', T3).lessons.x).toEqual({
        status: 'completed',
        lastOpenedAt: T1,
        completedAt: T3,
      });
    },
  );

  it('keeps a valid quizBest as a copy with only score and total', () => {
    const quizBest = { score: 3, total: 5, note: 'x' };
    const parsed = lessonFrom({ ...goodLesson, quizBest });
    expect(parsed?.quizBest).toEqual({ score: 3, total: 5 });
    expect(parsed?.quizBest).not.toBe(quizBest);
  });

  it.each([
    ['a string', '3/5'],
    ['null', null],
    ['an array', [3, 5]],
    ['a number', 3],
    ['strings for numbers', { score: '3', total: '5' }],
    ['a score above the total', { score: 9, total: 5 }],
    ['a negative score', { score: -1, total: 5 }],
    ['a zero total', { score: 0, total: 0 }],
    ['NaN', { score: Number.NaN, total: 5 }],
    ['a fraction', { score: 2.5, total: 5 }],
    ['a missing total', { score: 3 }],
  ])('omits a quizBest that is %s but keeps the record', (_name, quizBest) => {
    expect(lessonFrom({ ...goodLesson, quizBest })).toEqual(goodLesson);
  });
});
