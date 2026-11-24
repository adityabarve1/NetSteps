import { describe, expect, it } from 'vitest';
import {
  opKey,
  parseStoredOp,
  SEQ_PATTERN,
  seqOfKey,
  serializeOp,
} from '@/progress/pendingOps';
import type { PendingOp } from '@/progress/pendingOps';
import { seqAt } from '@/test/pendingStorage';
import { done, opened, stateOf, T1 } from '@/test/progressFixtures';

// The seq of the nth write: they sort in the order they were made.
const S = (n: number) => seqAt(1000 + n);
const UUID = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// One of every kind of write.
const everyKind: PendingOp[] = [
  { kind: 'lesson', id: 'a', record: done(T1), seq: S(1) },
  { kind: 'lab', id: 'lab-1', record: { status: 'started' }, seq: S(2) },
  {
    kind: 'quiz',
    attemptId: UUID(1),
    lessonId: 'a',
    score: 4,
    total: 5,
    at: T1,
    seq: S(3),
  },
  { kind: 'all', state: stateOf({ x: done(T1) }), seq: S(4) },
];

describe('names in storage', () => {
  it('a seq is zero-padded time, a counter and a suffix, and sorts as text', () => {
    expect(SEQ_PATTERN.test(seqAt(1_780_000_000_000, 'k3f9', 3))).toBe(true);
    expect(seqAt(999) < seqAt(1000)).toBe(true);
    expect(seqAt(9_999_999_999_999) < seqAt(10_000_000_000_000)).toBe(true);
    expect(SEQ_PATTERN.test('1-2-3')).toBe(false);
    expect(SEQ_PATTERN.test(`${seqAt(1)}x`)).toBe(false);
  });

  it('a write is stored at <base>.<seq>', () => {
    expect(opKey('netsteps.pending.u1', S(1))).toBe(
      `netsteps.pending.u1.${S(1)}`,
    );
  });

  it('finds the seq in the keys of this queue and nothing else', () => {
    const base = 'netsteps.pending.u1';
    expect(seqOfKey(base, `${base}.${S(1)}`)).toBe(S(1));
    expect(seqOfKey(base, base)).toBeNull(); // the old single key
    expect(seqOfKey(base, `${base}.`)).toBeNull();
    expect(seqOfKey(base, `${base}.not-a-seq`)).toBeNull();
    expect(seqOfKey(base, `netsteps.pending.u2.${S(1)}`)).toBeNull();
    expect(seqOfKey(base, `netsteps.pending.u1x.${S(1)}`)).toBeNull();
    expect(seqOfKey(base, `${base}.x.${S(1)}`)).toBeNull(); // another account, "u1.x"
    expect(seqOfKey('netsteps.pending.u1.x', `${base}.x.${S(1)}`)).toBe(S(1));
  });
});

describe('parseStoredOp: what comes back from localStorage is validated', () => {
  const stored = (op: unknown) => JSON.stringify({ v: 1, op });

  it('reads back what was written, for every kind of write', () => {
    for (const op of everyKind) {
      expect(parseStoredOp(op.seq, serializeOp(op))).toEqual(op);
    }
  });

  it('keeps the seq in the key, not in the value', () => {
    const op: PendingOp = {
      kind: 'lesson',
      id: 'a',
      record: opened(T1),
      seq: S(1),
    };
    expect(JSON.parse(serializeOp(op))).toEqual({
      v: 1,
      op: { kind: 'lesson', id: 'a', record: opened(T1) },
    });
  });

  const lab1 = { kind: 'lab', id: 'x', record: { status: 'started' } };
  const quizOp = {
    kind: 'quiz',
    attemptId: UUID(1),
    lessonId: 'a',
    score: 1,
    total: 5,
    at: T1,
  };
  it.each([
    ['nothing', null],
    ['corrupt JSON', '{nope'],
    ['an array', '[]'],
    ['an unknown version', JSON.stringify({ v: 2, op: lab1 })],
    ['no op', JSON.stringify({ v: 1 })],
    ['an op that is not an object', stored('x')],
    ['an unknown kind', stored({ kind: 'mystery' })],
    [
      'a lesson with no id',
      stored({ kind: 'lesson', id: '', record: opened(T1) }),
    ],
    [
      'a lesson with a bad record',
      stored({ kind: 'lesson', id: 'a', record: { status: 'bogus' } }),
    ],
    [
      'a hostile id with a bad record',
      stored({
        kind: 'lesson',
        id: 'constructor',
        record: { status: 'bogus' },
      }),
    ],
    [
      'a quiz with an id that is not a uuid',
      stored({ ...quizOp, attemptId: 'not-a-uuid' }),
    ],
    ['a quiz score above the total', stored({ ...quizOp, score: 9 })],
    ['a quiz with an unreadable time', stored({ ...quizOp, at: 'later' })],
  ])('rejects %s', (_name, raw) => {
    expect(parseStoredOp(S(1), raw)).toBeUndefined();
  });

  it('cleans the state inside a whole-state write', () => {
    const parsed = parseStoredOp(
      S(1),
      stored({
        kind: 'all',
        state: { lessons: { ok: opened(T1), bad: 3 }, labs: 9 },
      }),
    );
    expect(parsed).toEqual({
      kind: 'all',
      seq: S(1),
      state: { lessons: { ok: opened(T1) }, labs: {} },
    });
  });
});
