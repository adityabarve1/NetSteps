import { describe, expect, it } from 'vitest';
import { appendOp, MAX_PENDING_OPS, overlayOps } from '@/progress/pendingOps';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { seqAt } from '@/test/pendingStorage';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

// The seq of the nth write: they sort in the order they were made.
const S = (n: number) => seqAt(1000 + n);
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
});

function build(ops: WriteOp[], inFlight: string | null = null): PendingOp[] {
  let queue: PendingOp[] = [];
  ops.forEach((op, i) => {
    queue = appendOp(queue, op, S(i + 1), inFlight).queue;
  });
  return queue;
}

describe('appendOp: coalescing', () => {
  it('folds an earlier upsert for the same lesson in place, joined with the latest', () => {
    const queue = build([
      lesson('a', opened(T1)),
      lab('lab-1'),
      lesson('a', done(T2)),
    ]);
    // The lesson keeps its place (and its seq): its key is rewritten in storage.
    expect(queue.map((op) => op.kind)).toEqual(['lesson', 'lab']);
    expect(queue.map((op) => op.seq)).toEqual([S(1), S(2)]);
    expect(queue[0]).toMatchObject({
      kind: 'lesson',
      id: 'a',
      record: done(T2),
    });
  });

  it('says which write now carries the new one', () => {
    const first = appendOp([], lesson('a'), S(1), null);
    expect(first.held).toBe(S(1));
    const second = appendOp(first.queue, lesson('a', done(T2)), S(2), null);
    expect(second.held).toBe(S(1));
    expect(second.queue).toHaveLength(1);
    const third = appendOp(second.queue, lesson('b'), S(3), null);
    expect(third.held).toBe(S(3));
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

  it('folds an earlier upsert for the same lab', () => {
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
    const first = appendOp([], lesson('a'), S(1), null).queue;
    const next = appendOp(first, lesson('a', done(T2)), S(2), S(1));
    expect(next.queue.map((op) => op.seq)).toEqual([S(1), S(2)]);
    expect(next.held).toBe(S(2));
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
    const result = appendOp([], quiz(1, 'a', 3), S(1), null, 3);
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
      const step = appendOp(queue, op, S(i + 1), null, cap);
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
      queue = appendOp(queue, quiz(i, 'a', i % 6), S(i), null, 5).queue;
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
        S(i),
        null,
        3,
      );
      queue = step.queue;
      dropped += step.dropped;
    }
    queue = appendOp(queue, lab('lab-1'), S(7), null, 3).queue;
    queue = appendOp(queue, all(), S(8), null, 3).queue;
    expect(dropped).toBe(0);
    expect(queue.filter((op) => op.kind === 'lesson')).toHaveLength(6);
    expect(queue.some((op) => op.kind === 'all')).toBe(true);
    expect(queue.some((op) => op.kind === 'lab')).toBe(true);
  });

  it('never drops the operation that is being sent', () => {
    const first = appendOp([], quiz(1, 'a', 1), S(1), null, 2).queue;
    const second = appendOp(first, quiz(2, 'a', 2), S(2), null, 2).queue;
    const third = appendOp(second, quiz(3, 'a', 3), S(3), S(1), 2).queue;
    expect(third.map((op) => op.seq)).toContain(S(1));
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
        { kind: 'all', state: stateOf({ c: done(T3) }) },
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
