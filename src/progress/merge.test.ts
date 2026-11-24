import { describe, expect, it } from 'vitest';
import { emptyProgress, mergeProgress } from '@/progress/logic';
import type { LabRecord, LessonRecord, ProgressState } from '@/progress/types';
import {
  deepFreeze,
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

// Merge two versions of one lesson in both orders. The two orders must agree,
// so every rule below is checked both ways round.
function mergeLessons(
  a: LessonRecord,
  b: LessonRecord,
): LessonRecord | undefined {
  const ab = mergeProgress(stateOf({ x: a }), stateOf({ x: b }));
  const ba = mergeProgress(stateOf({ x: b }), stateOf({ x: a }));
  expect(ab).toEqual(ba);
  return ab.lessons.x;
}

function mergeLabs(a: LabRecord, b: LabRecord): LabRecord | undefined {
  const ab = mergeProgress(
    { lessons: {}, labs: { x: a } },
    { lessons: {}, labs: { x: b } },
  );
  const ba = mergeProgress(
    { lessons: {}, labs: { x: b } },
    { lessons: {}, labs: { x: a } },
  );
  expect(ab).toEqual(ba);
  return ab.labs.x;
}

const quizOf = (a: LessonRecord, b: LessonRecord) =>
  mergeLessons(a, b)?.quizBest;

describe('mergeProgress: lessons', () => {
  it('lets completed beat in_progress, keeping the later open time', () => {
    expect(mergeLessons(done(T1), opened(T3))).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T1,
    });
  });

  it('keeps the earliest completedAt', () => {
    const merged = mergeLessons(done(T3), { ...done(T1), lastOpenedAt: T2 });
    expect(merged).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T1,
    });
  });

  it('keeps a completedAt when only one side has one', () => {
    const missing: LessonRecord = { status: 'completed', lastOpenedAt: T1 };
    expect(mergeLessons(missing, done(T2))?.completedAt).toBe(T2);
    expect(mergeLessons(missing, missing)).toEqual(missing);
  });

  it('keeps the latest lastOpenedAt, comparing instants not text', () => {
    expect(mergeLessons(opened(T1), opened(T2))?.lastOpenedAt).toBe(T2);
    // 10:00 at +05:00 is 05:00Z: earlier than 06:00Z although it sorts later.
    const merged = mergeLessons(
      opened('2026-03-01T10:00:00+05:00'),
      opened('2026-03-01T06:00:00Z'),
    );
    expect(merged?.lastOpenedAt).toBe('2026-03-01T06:00:00Z');
  });

  it('compares completedAt as instants too', () => {
    const merged = mergeLessons(
      { ...done(T1), completedAt: '2026-03-01T10:00:00+05:00' },
      { ...done(T1), completedAt: '2026-03-01T06:00:00Z' },
    );
    expect(merged?.completedAt).toBe('2026-03-01T10:00:00+05:00');
  });

  it('keeps the higher quiz ratio, not the higher score', () => {
    const three = withQuiz(opened(T1), 3, 5);
    expect(quizOf(three, withQuiz(opened(T1), 4, 5))).toEqual({
      score: 4,
      total: 5,
    });
    expect(quizOf(three, withQuiz(opened(T1), 5, 10))).toEqual({
      score: 3,
      total: 5,
    });
    expect(
      quizOf(withQuiz(opened(T1), 4, 5), withQuiz(opened(T1), 2, 2)),
    ).toEqual({ score: 2, total: 2 });
  });

  it('compares quiz ratios exactly, beyond floating-point precision', () => {
    const n = Number.MAX_SAFE_INTEGER;
    const merged = quizOf(
      withQuiz(opened(T1), n - 2, n - 1),
      withQuiz(opened(T1), n - 1, n),
    );
    expect(merged).toEqual({ score: n - 1, total: n });
  });

  it('on an equal ratio with different totals, keeps the larger total', () => {
    const merged = quizOf(
      withQuiz(opened(T1), 3, 5),
      withQuiz(opened(T1), 6, 10),
    );
    expect(merged).toEqual({ score: 6, total: 10 });
  });

  it('keeps the quiz result when only one side has one', () => {
    expect(quizOf(withQuiz(opened(T1), 1, 5), opened(T2))).toEqual({
      score: 1,
      total: 5,
    });
  });

  it.each([
    ['score above total', { score: 9, total: 5 }],
    ['negative score', { score: -1, total: 5 }],
    ['zero total', { score: 0, total: 0 }],
    ['negative total', { score: 1, total: -5 }],
    ['NaN', { score: Number.NaN, total: 5 }],
    ['infinity', { score: Infinity, total: Infinity }],
    ['fractions', { score: 2.5, total: 5 }],
  ])('never lets a quiz result with %s win, and drops it alone', (_n, bad) => {
    const broken: LessonRecord = { ...opened(T1), quizBest: bad };
    expect(quizOf(broken, withQuiz(opened(T1), 0, 5))).toEqual({
      score: 0,
      total: 5,
    });
    expect(mergeLessons(broken, opened(T1))).toEqual(opened(T1));
    expect(mergeLessons(broken, broken)).toEqual(opened(T1));
  });

  it.each([
    ['empty text', ''],
    ['plain text', 'garbage'],
    ['a bare number', '1'],
    ['a US date', '12/31/9999'],
    ['a date with no time', '2026-03-01'],
    ['a time with no zone', '2026-03-01T10:00:00'],
    ['an HTTP date', 'Mon, 02 Mar 2026 10:00:00 GMT'],
    ['an impossible date', '2026-13-45T99:99:99Z'],
  ])('never lets %s win, and never throws', (_name, bad) => {
    const merged = mergeLessons(
      { ...done(bad), lastOpenedAt: bad },
      { ...done(T2), lastOpenedAt: T1 },
    );
    expect(merged).toEqual({
      status: 'completed',
      lastOpenedAt: T1,
      completedAt: T2,
    });
  });

  it('settles ties the same in both orders (mergeLessons checks both)', () => {
    expect(mergeLessons(opened('garbage'), opened('other'))).toBeDefined();
    const zulu = '2026-03-01T10:00:00.000Z';
    const offset = '2026-03-01T10:00:00+00:00';
    const merged = mergeLessons(
      { status: 'completed', lastOpenedAt: zulu, completedAt: zulu },
      { status: 'completed', lastOpenedAt: offset, completedAt: offset },
    );
    expect(merged).toBeDefined();
  });

  it('keeps a lesson that is on one side only, and unites the rest', () => {
    const a = stateOf({ a1: done(T1) });
    const b = stateOf({ b1: withQuiz(opened(T2), 3, 5) });
    const expected = { a1: done(T1), b1: withQuiz(opened(T2), 3, 5) };
    expect(mergeProgress(a, b).lessons).toEqual(expected);
    expect(mergeProgress(b, a).lessons).toEqual(expected);
  });

  it('merging with an empty state changes nothing', () => {
    const s: ProgressState = {
      lessons: { a1: withQuiz(done(T1), 4, 5), a2: opened(T2) },
      labs: { 'lab-x': { status: 'started' } },
    };
    expect(mergeProgress(s, emptyProgress())).toEqual(s);
    expect(mergeProgress(emptyProgress(), s)).toEqual(s);
    expect(mergeProgress(emptyProgress(), emptyProgress())).toEqual(
      emptyProgress(),
    );
  });

  it('keeps only known fields, so stray fields cannot order the result', () => {
    const noisy = { ...withQuiz(done(T1), 3, 5), note: 'x' } as LessonRecord;
    const other = { ...withQuiz(done(T1), 3, 5), note: 'y' } as LessonRecord;
    expect(mergeLessons(noisy, other)).toEqual(withQuiz(done(T1), 3, 5));
  });

  it('does not touch its arguments, or lose a lesson id such as __proto__', () => {
    // JSON.parse makes "__proto__" an ordinary own key, as edited storage could.
    const raw = (record: LessonRecord): ProgressState =>
      JSON.parse(
        `{"lessons":{"__proto__":${JSON.stringify(record)}},"labs":{}}`,
      ) as ProgressState;
    const a = deepFreeze(raw(opened(T1)));
    const b = deepFreeze(raw(done(T2)));
    const merged = mergeProgress(a, b);
    expect(Object.keys(merged.lessons)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(merged.lessons)).toBe(Object.prototype);
    const entry = Object.getOwnPropertyDescriptor(merged.lessons, '__proto__');
    expect(entry?.value).toEqual({
      status: 'completed',
      lastOpenedAt: T2,
      completedAt: T2,
    });
    expect(({} as Record<string, unknown>).status).toBeUndefined();
  });
});

describe('mergeProgress: labs', () => {
  it('lets completed beat started', () => {
    const merged = mergeLabs(
      { status: 'started' },
      { status: 'completed', completedAt: T2 },
    );
    expect(merged).toEqual({ status: 'completed', completedAt: T2 });
  });

  it('keeps the earliest completedAt', () => {
    const merged = mergeLabs(
      { status: 'completed', completedAt: T3 },
      { status: 'completed', completedAt: T1 },
    );
    expect(merged).toEqual({ status: 'completed', completedAt: T1 });
  });

  it('keeps started when both are started, and a lab on one side only', () => {
    expect(mergeLabs({ status: 'started' }, { status: 'started' })).toEqual({
      status: 'started',
    });
    const a: ProgressState = {
      lessons: {},
      labs: { one: { status: 'started' } },
    };
    const b: ProgressState = {
      lessons: {},
      labs: { two: { status: 'completed', completedAt: T1 } },
    };
    expect(mergeProgress(a, b).labs).toEqual({
      one: { status: 'started' },
      two: { status: 'completed', completedAt: T1 },
    });
  });

  it('fills a missing completedAt and never lets an unreadable one win', () => {
    const bare: LabRecord = { status: 'completed' };
    const dated: LabRecord = { status: 'completed', completedAt: T2 };
    expect(mergeLabs(bare, dated)?.completedAt).toBe(T2);
    const broken: LabRecord = { status: 'completed', completedAt: 'garbage' };
    expect(mergeLabs(broken, { ...dated, completedAt: T3 })).toEqual({
      status: 'completed',
      completedAt: T3,
    });
  });
});
