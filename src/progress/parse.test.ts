import { describe, expect, it } from 'vitest';
import { parseProgress } from '@/progress/parse';
import type { ProgressState } from '@/progress/types';
import { deepFreeze, T1, T2, T3 } from '@/test/progressFixtures';

const valid: ProgressState = {
  lessons: {
    a1: {
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T2,
      quizBest: { score: 4, total: 5 },
    },
    a2: { status: 'in_progress', lastOpenedAt: T1 },
  },
  labs: {
    'lab-1': { status: 'started' },
    'lab-2': { status: 'completed', completedAt: T2 },
  },
};

// Parse one lab record inside an otherwise empty state.
const labFrom = (record: unknown) =>
  parseProgress({ lessons: {}, labs: { x: record } }).labs.x;
const goodLesson = { status: 'in_progress', lastOpenedAt: T1 };

describe('parseProgress: the whole state', () => {
  it('returns a well-shaped valid state unchanged, as fresh copies', () => {
    const parsed = parseProgress(valid);
    expect(parsed).toEqual(valid);
    expect(parsed).not.toBe(valid);
    expect(parsed.lessons).not.toBe(valid.lessons);
    expect(parsed.lessons.a1).not.toBe(valid.lessons.a1);
    expect(parsed.lessons.a1?.quizBest).not.toBe(valid.lessons.a1?.quizBest);
    expect(parsed.labs['lab-2']).not.toBe(valid.labs['lab-2']);
  });

  it('survives a JSON round trip unchanged', () => {
    const raw: unknown = JSON.parse(JSON.stringify(valid));
    expect(parseProgress(raw)).toEqual(valid);
  });

  it('is idempotent', () => {
    const messy = {
      lessons: { a: goodLesson, b: null, c: { status: 1 } },
      labs: 5,
      extra: true,
    };
    const once = parseProgress(messy);
    expect(parseProgress(once)).toEqual(once);
    expect(parseProgress(valid)).toEqual(parseProgress(parseProgress(valid)));
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'x'],
    ['a number', 42],
    ['a boolean', true],
    ['a bigint', 10n],
    ['a symbol', Symbol('x')],
    ['a function', () => 1],
    ['an empty array', []],
    ['an array holding a state', [valid]],
    ['an array with state fields', Object.assign([], valid)],
    ['a Map with state fields', Object.assign(new Map(), valid)],
    ['a Map', new Map()],
    ['a Date', new Date()],
  ])('gives an empty state for %s', (_name, raw) => {
    expect(parseProgress(raw)).toEqual({ lessons: {}, labs: {} });
    expect(parseProgress(raw)).not.toBe(parseProgress(raw));
  });

  it.each([
    ['an empty object', {}, { lessons: {}, labs: {} }],
    ['no labs key', { lessons: {} }, { lessons: {}, labs: {} }],
    ['no lessons key', { labs: {} }, { lessons: {}, labs: {} }],
    ['lessons undefined', { lessons: undefined }, { lessons: {}, labs: {} }],
    ['lessons null', { lessons: null, labs: {} }, { lessons: {}, labs: {} }],
    ['lessons an array', { lessons: [], labs: {} }, { lessons: {}, labs: {} }],
    [
      'lessons an array of records',
      { lessons: [goodLesson], labs: {} },
      { lessons: {}, labs: {} },
    ],
    [
      'lessons an array with ids',
      { lessons: Object.assign([], { x: goodLesson }), labs: {} },
      { lessons: {}, labs: {} },
    ],
    ['lessons a string', { lessons: 'x', labs: {} }, { lessons: {}, labs: {} }],
    ['labs a number', { lessons: {}, labs: 5 }, { lessons: {}, labs: {} }],
    ['labs an array', { lessons: {}, labs: [1] }, { lessons: {}, labs: {} }],
  ])('repairs %s into two tables', (_name, raw, expected) => {
    expect(parseProgress(raw)).toEqual(expected);
  });

  it('keeps one good table when the other is broken', () => {
    const labs = { 'lab-1': { status: 'started' } };
    expect(parseProgress({ lessons: [], labs }).labs).toEqual(labs);
    const lessons = { a: goodLesson };
    expect(parseProgress({ lessons, labs: 5 }).lessons).toEqual(lessons);
  });

  it('drops unknown fields at every level', () => {
    const noisy = {
      lessons: {
        a1: {
          ...goodLesson,
          quizBest: { score: 3, total: 5, note: 'x' },
          note: 'x',
        },
      },
      labs: { l: { status: 'started', note: 'x' } },
      note: 'x',
    };
    expect(parseProgress(noisy)).toEqual({
      lessons: {
        a1: { ...goodLesson, quizBest: { score: 3, total: 5 } },
      },
      labs: { l: { status: 'started' } },
    });
  });

  it('accepts an object with no prototype', () => {
    const bare = Object.assign(Object.create(null), valid) as unknown;
    expect(parseProgress(bare)).toEqual(valid);
  });

  it('does not touch a frozen input', () => {
    const frozen = deepFreeze(structuredClone(valid));
    expect(parseProgress(frozen)).toEqual(valid);
    expect(frozen).toEqual(valid);
  });
});

describe('parseProgress: lab records', () => {
  it('keeps valid labs, with or without completedAt', () => {
    expect(labFrom({ status: 'started' })).toEqual({ status: 'started' });
    const done = { status: 'completed', completedAt: T1 };
    expect(labFrom(done)).toEqual(done);
    expect(labFrom({ status: 'completed' })).toEqual({ status: 'completed' });
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an array', [{ status: 'started' }]],
    ['an array with lab fields', Object.assign([], { status: 'started' })],
    ['no status', { completedAt: T1 }],
    ['status a number', { status: 1 }],
    ['a lesson status', { status: 'in_progress' }],
    ['an unknown status', { status: 'finished' }],
  ])('drops a lab: %s', (_name, record) => {
    expect(labFrom(record)).toBeUndefined();
  });

  it.each([
    ['plain text', 'garbage'],
    ['a number', 5],
    ['an object', {}],
    ['null', null],
  ])(
    'omits a completedAt that is %s but keeps the lab',
    (_name, completedAt) => {
      expect(labFrom({ status: 'completed', completedAt })).toEqual({
        status: 'completed',
      });
    },
  );
});

describe('parseProgress: ids', () => {
  const lesson = { status: 'in_progress', lastOpenedAt: T1 };

  it('drops an empty id and keeps other odd ids', () => {
    const parsed = parseProgress({
      lessons: { '': lesson, ' ': lesson, 'l1-é-ü': lesson },
      labs: { '': { status: 'started' } },
    });
    expect(Object.keys(parsed.lessons).sort()).toEqual([' ', 'l1-é-ü']);
    expect(parsed.labs).toEqual({});
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', 'valueOf'])(
    'keeps %j as an ordinary own id',
    (id) => {
      const parsed = parseProgress({
        lessons: { [id]: lesson },
        labs: { [id]: { status: 'started' } },
      });
      expect(Object.keys(parsed.lessons)).toEqual([id]);
      expect(
        Object.getOwnPropertyDescriptor(parsed.lessons, id)?.value,
      ).toEqual(lesson);
      expect(Object.keys(parsed.labs)).toEqual([id]);
    },
  );

  it('keeps a JSON-made own __proto__ id as an ordinary key', () => {
    const text = `{"lessons":{"__proto__":${JSON.stringify(lesson)}},"labs":{"__proto__":{"status":"started"}}}`;
    const raw: unknown = JSON.parse(text);
    const parsed = parseProgress(raw);
    expect(Object.keys(parsed.lessons)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(parsed.lessons)).toBe(Object.prototype);
    expect(
      Object.getOwnPropertyDescriptor(parsed.lessons, '__proto__')?.value,
    ).toEqual(lesson);
    expect(Object.keys(parsed.labs)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(parsed.labs)).toBe(Object.prototype);
    expect(parseProgress(parsed)).toEqual(parsed);
  });

  it('never lets a hostile key reach a prototype', () => {
    const text = `{"__proto__":{"polluted":true},"lessons":{"x":{"status":"in_progress","lastOpenedAt":"${T1}","__proto__":{"status":"completed","polluted":true}}},"labs":{}}`;
    const raw: unknown = JSON.parse(text);
    const parsed = parseProgress(raw);
    expect(parsed.lessons.x).toEqual(lesson);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).status).toBeUndefined();
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });
});
