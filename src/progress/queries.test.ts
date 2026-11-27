import { describe, expect, it } from 'vitest';
import {
  canComplete,
  continueTarget,
  emptyProgress,
  levelProgress,
  overallProgress,
} from '@/progress/logic';
import type { CurriculumLevel, ProgressState } from '@/progress/types';
import {
  deepFreeze,
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
} from '@/test/progressFixtures';

const level1: CurriculumLevel = {
  lessons: [
    { id: 'a1', built: true },
    { id: 'a2', built: true },
    { id: 'a3', built: true },
    { id: 'a4', built: false },
  ],
};
const level2: CurriculumLevel = {
  lessons: [
    { id: 'b1', built: true },
    { id: 'b2', built: false },
  ],
};

describe('continueTarget', () => {
  it('picks the most recently opened incomplete lesson', () => {
    const s = stateOf({ a1: opened(T1), a2: opened(T3), a3: opened(T2) });
    expect(continueTarget(s, [level1, level2])).toBe('a2');
  });

  it('compares times as instants, not as text', () => {
    // a1 is 05:00Z and a2 is 06:00Z, although a1 sorts later as text.
    const s = stateOf({
      a1: opened('2026-03-01T10:00:00+05:00'),
      a2: opened('2026-03-01T06:00:00Z'),
    });
    expect(continueTarget(s, [level1])).toBe('a2');
  });

  it('ignores completed lessons, even the most recent one', () => {
    const s = stateOf({ a1: done(T3), a2: opened(T1) });
    expect(continueTarget(s, [level1])).toBe('a2');
  });

  it('breaks a tie on lastOpenedAt by course order', () => {
    const s = stateOf({ a3: opened(T2), a2: opened(T2) });
    expect(continueTarget(s, [level1])).toBe('a2');
    const across = stateOf({ b1: opened(T2), a3: opened(T2) });
    expect(continueTarget(across, [level1, level2])).toBe('a3');
    expect(continueTarget(across, [level2, level1])).toBe('b1');
  });

  it('treats the same instant written two ways as a tie', () => {
    // As text the second sorts later, as an instant they are equal.
    const s = stateOf({
      a2: opened('2026-03-01T10:00:00+00:00'),
      a3: opened('2026-03-01T10:00:00.000Z'),
    });
    expect(continueTarget(s, [level1])).toBe('a2');
  });

  it('falls back to the first incomplete built lesson in course order', () => {
    expect(continueTarget(emptyProgress(), [level1, level2])).toBe('a1');
    const s = stateOf({ a1: done(T1), a2: done(T2) });
    expect(continueTarget(s, [level1, level2])).toBe('a3');
    expect(continueTarget(s, [level2, level1])).toBe('b1');
  });

  it('skips unbuilt lessons and ignores records for unknown or unbuilt ids', () => {
    const s = stateOf({ a1: opened(T1), a4: opened(T3), zzz: opened(T3) });
    expect(continueTarget(s, [level1])).toBe('a1');
    const unbuiltFirst: CurriculumLevel = {
      lessons: [
        { id: 'u1', built: false },
        { id: 'u2', built: true },
      ],
    };
    expect(continueTarget(emptyProgress(), [unbuiltFirst])).toBe('u2');
  });

  it('returns null when every built lesson is done, or none is built', () => {
    const s = stateOf({
      a1: done(T1),
      a2: done(T1),
      a3: done(T1),
      b1: done(T1),
      a4: opened(T3),
    });
    expect(continueTarget(s, [level1, level2])).toBeNull();
    const none: CurriculumLevel = { lessons: [{ id: 'x', built: false }] };
    expect(continueTarget(emptyProgress(), [none])).toBeNull();
    expect(continueTarget(emptyProgress(), [{ lessons: [] }])).toBeNull();
    expect(continueTarget(emptyProgress(), [])).toBeNull();
  });

  it('lets an unreadable time lose to a real one, and tie with another', () => {
    const real = stateOf({ a1: opened('garbage'), a2: opened(T1) });
    expect(continueTarget(real, [level1])).toBe('a2');
    const both = stateOf({ a3: opened('garbage'), a2: opened('also garbage') });
    expect(continueTarget(both, [level1])).toBe('a2');
  });

  it('still prefers an opened lesson with an unreadable time to an unopened one', () => {
    const s = stateOf({ a2: opened('garbage') });
    expect(continueTarget(s, [level1])).toBe('a2');
  });
});

describe('levelProgress and overallProgress', () => {
  const six: CurriculumLevel = {
    lessons: ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => ({
      id,
      built: true,
    })),
  };

  it('counts completed built lessons against built lessons', () => {
    const s = stateOf({ s1: done(T1), s2: done(T2), s3: opened(T3) });
    expect(levelProgress(s, six)).toEqual({ done: 2, total: 6 });
  });

  it('ignores records for lessons that are not in the level', () => {
    const s = stateOf({ s1: done(T1), other: done(T1), a1: done(T1) });
    expect(levelProgress(s, six)).toEqual({ done: 1, total: 6 });
  });

  it('counts only built lessons, and a level with none is 0 of 0', () => {
    const s = stateOf({ a1: done(T1), a4: done(T1) });
    expect(levelProgress(s, level1)).toEqual({ done: 1, total: 3 });
    const allUnbuilt: CurriculumLevel = {
      lessons: [
        { id: 'x', built: false },
        { id: 'y', built: false },
      ],
    };
    expect(levelProgress(stateOf({ x: done(T1) }), allUnbuilt)).toEqual({
      done: 0,
      total: 0,
    });
  });

  it('adds the levels up for the overall figure', () => {
    const s = stateOf({
      a1: done(T1),
      a2: done(T1),
      b1: done(T1),
      b2: done(T1),
    });
    expect(overallProgress(s, [level1, level2])).toEqual({ done: 3, total: 4 });
    expect(overallProgress(s, [])).toEqual({ done: 0, total: 0 });
  });
});

describe('lesson ids that clash with object internals', () => {
  it('does not count an unrecorded lesson named like an inherited property', () => {
    const level: CurriculumLevel = {
      lessons: ['__proto__', 'constructor', 'toString', 'hasOwnProperty'].map(
        (id) => ({ id, built: true }),
      ),
    };
    expect(levelProgress(emptyProgress(), level)).toEqual({
      done: 0,
      total: 4,
    });
    expect(continueTarget(emptyProgress(), [level])).toBe('__proto__');
  });
});

describe('canComplete', () => {
  it.each([
    [false, false, false],
    [true, false, false],
    [false, true, false],
    [true, true, true],
  ])('sim finished %s and quiz submitted %s gives %s', (sim, quiz, want) => {
    const run = { primarySimFinished: sim, quizSubmitted: quiz };
    expect(canComplete(run)).toBe(want);
  });

  it('ends true whichever of the two happens first', () => {
    const quizFirst = { primarySimFinished: false, quizSubmitted: true };
    expect(canComplete(quizFirst)).toBe(false);
    expect(canComplete({ ...quizFirst, primarySimFinished: true })).toBe(true);

    const simFirst = { primarySimFinished: true, quizSubmitted: false };
    expect(canComplete(simFirst)).toBe(false);
    expect(canComplete({ ...simFirst, quizSubmitted: true })).toBe(true);
  });
});

describe('purity', () => {
  it('never mutates the state or the levels it reads', () => {
    const state: ProgressState = stateOf({ a1: done(T1), a2: opened(T2) });
    const frozen = deepFreeze(structuredClone(state));
    const levels = deepFreeze([
      structuredClone(level1),
      structuredClone(level2),
    ]);
    expect(() => {
      continueTarget(frozen, levels);
      levelProgress(frozen, level1);
      overallProgress(frozen, levels);
    }).not.toThrow();
    expect(frozen).toEqual(state);
  });
});
