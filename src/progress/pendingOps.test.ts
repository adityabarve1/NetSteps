import { describe, expect, it } from 'vitest';
import {
  appendOp,
  MAX_PENDING_OPS,
  overlayOps,
  parsePending,
} from '@/progress/pendingOps';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

const UUID = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const lesson = (id: string, record = opened(T1)): WriteOp => ({
  kind: 'lesson',
  id,
  record,
});
const lab = (id: string): WriteOp => ({
  kind: 'lab',
  id,
  record: { status: 'started' },
});
const quiz = (
  n: number,
  lessonId: string,
  score: number,
  total = 5,
): WriteOp => ({
  kind: 'quiz',
  attemptId: UUID(n),
  lessonId,
  score,
  total,
  at: T1,
});
const all = (): WriteOp => ({
  kind: 'all',
  state: stateOf({ x: done(T1) }),
  attemptIds: {},
});

function build(ops: WriteOp[], inFlight: number | null = null): PendingOp[] {
  let queue: PendingOp[] = [];
  ops.forEach((op, i) => {
    queue = appendOp(queue, op, i + 1, inFlight).queue;
  });
  return queue;
}

describe('appendOp: coalescing', () => {
  it('replaces an earlier upsert for the same lesson with the joined latest', () => {
    const queue = build([
      lesson('a', opened(T1)),
      lab('lab-1'),
      lesson('a', done(T2)),
    ]);
    expect(queue.map((op) => op.kind)).toEqual(['lab', 'lesson']);
    expect(queue[1]).toMatchObject({
      kind: 'lesson',
      id: 'a',
      record: done(T2),
    });
  });

  it('never lets a coalesced record lose a completion', () => {
    // The newer record is stale (in progress) but the older one was completed.
    const queue = build([lesson('a', done(T1)), lesson('a', opened(T3))]);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      kind: 'lesson',
      record: { status: 'completed', completedAt: T1, lastOpenedAt: T3 },
    });
  });

  it('replaces an earlier upsert for the same lab', () => {
    const queue = build([
      lab('lab-1'),
      {
        kind: 'lab',
        id: 'lab-1',
        record: { status: 'completed', completedAt: T2 },
      },
    ]);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      record: { status: 'completed', completedAt: T2 },
    });
  });

  it('keeps different lessons apart', () => {
    expect(build([lesson('a'), lesson('b')])).toHaveLength(2);
  });

  it('does not coalesce across a whole-state write', () => {
    const queue = build([lesson('a'), all(), lesson('a', done(T2))]);
    expect(queue.map((op) => op.kind)).toEqual(['lesson', 'all', 'lesson']);
  });

  it('does not touch the operation that is being sent right now', () => {
    const first = appendOp([], lesson('a'), 1, null).queue;
    const next = appendOp(first, lesson('a', done(T2)), 2, 1).queue;
    expect(next.map((op) => op.seq)).toEqual([1, 2]);
  });

  it('never coalesces quiz attempts: each submit is its own row', () => {
    expect(build([quiz(1, 'a', 3), quiz(2, 'a', 3)])).toHaveLength(2);
  });
});

describe('appendOp: the length cap', () => {
  it('documents a cap of 500', () => {
    expect(MAX_PENDING_OPS).toBe(500);
  });

  it('under the cap, drops nothing', () => {
    const result = appendOp([], quiz(1, 'a', 3), 1, null, 3);
    expect(result.dropped).toBe(0);
  });

  it('drops the oldest quiz attempt that a better or equal one makes redundant', () => {
    let queue: PendingOp[] = [];
    let dropped = 0;
    const cap = 4;
    [
      quiz(1, 'a', 5), // the best for 'a'; must survive
      quiz(2, 'a', 2), // dominated, oldest of the dominated
      quiz(3, 'a', 3), // dominated
      quiz(4, 'b', 1),
      quiz(5, 'b', 2), // over the cap: something has to go
    ].forEach((op, i) => {
      const step = appendOp(queue, op, i + 1, null, cap);
      queue = step.queue;
      dropped += step.dropped;
    });
    expect(queue).toHaveLength(cap);
    expect(dropped).toBe(1);
    const kept = queue.flatMap((op) =>
      op.kind === 'quiz' ? [op.attemptId] : [],
    );
    expect(kept).toContain(UUID(1));
    expect(kept).not.toContain(UUID(2));
  });

  it('keeps the best score for every lesson even under pressure', () => {
    let queue: PendingOp[] = [];
    for (let i = 1; i <= 30; i += 1) {
      queue = appendOp(queue, quiz(i, 'a', i % 6), i, null, 5).queue;
    }
    const best = queue.flatMap((op) => (op.kind === 'quiz' ? [op.score] : []));
    expect(Math.max(...best)).toBe(5);
    expect(queue.length).toBeLessThanOrEqual(5);
  });

  it('never drops a lesson, lab or whole-state write, even over the cap', () => {
    let queue: PendingOp[] = [];
    let dropped = 0;
    for (let i = 1; i <= 6; i += 1) {
      const step = appendOp(
        queue,
        lesson(`l${String(i)}`, done(T1)),
        i,
        null,
        3,
      );
      queue = step.queue;
      dropped += step.dropped;
    }
    queue = appendOp(queue, lab('lab-1'), 7, null, 3).queue;
    queue = appendOp(queue, all(), 8, null, 3).queue;
    expect(dropped).toBe(0);
    expect(queue.filter((op) => op.kind === 'lesson')).toHaveLength(6);
    expect(queue.some((op) => op.kind === 'all')).toBe(true);
    expect(queue.some((op) => op.kind === 'lab')).toBe(true);
  });

  it('never drops the operation that is being sent', () => {
    const first = appendOp([], quiz(1, 'a', 1), 1, null, 2).queue;
    const second = appendOp(first, quiz(2, 'a', 2), 2, null, 2).queue;
    const third = appendOp(second, quiz(3, 'a', 3), 3, 1, 2).queue;
    expect(third.map((op) => op.seq)).toContain(1);
  });
});

describe('overlayOps: what the queued writes would add to a loaded state', () => {
  it('applies lessons, labs, quiz attempts and whole-state writes', () => {
    const base = stateOf({ a: opened(T1) });
    const result = overlayOps(
      base,
      build([
        lesson('a', done(T2)),
        lesson('b', opened(T1)),
        lab('lab-1'),
        quiz(1, 'b', 4),
        { kind: 'all', state: stateOf({ c: done(T3) }), attemptIds: {} },
      ]),
    );
    expect(result.lessons.a).toEqual(done(T2));
    expect(result.lessons.b).toEqual(withQuiz(opened(T1), 4, 5));
    expect(result.lessons.c).toEqual(done(T3));
    expect(result.labs['lab-1']).toEqual({ status: 'started' });
  });

  it('returns the same state when nothing is queued', () => {
    const base = stateOf({ a: opened(T1) });
    expect(overlayOps(base, [])).toBe(base);
  });
});

describe('parsePending: what comes back from localStorage is validated', () => {
  const stored = (ops: unknown) => JSON.stringify({ v: 1, ops });

  it('reads back what was written', () => {
    const queue = build([
      lesson('a', done(T1)),
      lab('lab-1'),
      quiz(1, 'a', 4),
      all(),
    ]);
    expect(parsePending(stored(queue))).toEqual(queue);
  });

  it.each([
    ['nothing', null],
    ['corrupt JSON', '{nope'],
    ['an array', '[]'],
    ['an unknown version', JSON.stringify({ v: 2, ops: [] })],
    ['ops that are not a list', JSON.stringify({ v: 1, ops: 'x' })],
  ])('is empty for %s', (_name, raw) => {
    expect(parsePending(raw)).toEqual([]);
  });

  it('drops only the damaged operations and keeps the rest', () => {
    const good = build([lesson('a', done(T1))])[0];
    const parsed = parsePending(
      stored([
        null,
        7,
        { seq: 1, kind: 'mystery' },
        { seq: 2, kind: 'lesson', id: '', record: opened(T1) },
        { seq: 3, kind: 'lesson', id: 'a', record: { status: 'bogus' } },
        {
          seq: 4,
          kind: 'lesson',
          id: 'constructor',
          record: { status: 'bogus' },
        },
        { seq: -1, kind: 'lab', id: 'x', record: { status: 'started' } },
        {
          seq: 5,
          kind: 'quiz',
          attemptId: 'not-a-uuid',
          lessonId: 'a',
          score: 1,
          total: 5,
          at: T1,
        },
        {
          seq: 6,
          kind: 'quiz',
          attemptId: UUID(1),
          lessonId: 'a',
          score: 9,
          total: 5,
          at: T1,
        },
        {
          seq: 7,
          kind: 'quiz',
          attemptId: UUID(1),
          lessonId: 'a',
          score: 1,
          total: 5,
          at: 'later',
        },
        good,
      ]),
    );
    expect(parsed).toEqual([good]);
  });

  it('cleans the state inside a whole-state write and its attempt ids', () => {
    const parsed = parsePending(
      stored([
        {
          seq: 1,
          kind: 'all',
          state: { lessons: { ok: opened(T1), bad: 3 }, labs: 9 },
          attemptIds: { ok: UUID(2), bad: 'no', other: 5 },
        },
      ]),
    );
    expect(parsed).toEqual([
      {
        seq: 1,
        kind: 'all',
        state: { lessons: { ok: opened(T1) }, labs: {} },
        attemptIds: { ok: UUID(2) },
      },
    ]);
  });
});
