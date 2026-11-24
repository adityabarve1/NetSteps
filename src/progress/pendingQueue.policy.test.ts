import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { createPendingQueue } from '@/progress/pendingQueue';
import { RemoteFailure } from '@/progress/remoteFailure';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';
import { deferred } from '@/test/fakeSupabase';

const KEY = 'netsteps.pending.user-1';
const lesson = (id: string, record = opened(T1)): WriteOp => ({
  kind: 'lesson',
  id,
  record,
});
const quiz = (n: number, score = 3): WriteOp => ({
  kind: 'quiz',
  attemptId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  lessonId: 'a',
  score,
  total: 5,
  at: T1,
});
const down = () => new RemoteFailure('Failed to fetch', 0, '');
const poison = () => new RemoteFailure('duplicate key', 409, '23505');
const label = (op: PendingOp) =>
  op.kind === 'lesson' || op.kind === 'lab' ? op.id : op.kind;

type Run = (op: PendingOp) => Promise<void>;

function setup(
  run: Run = () => Promise.resolve(),
  extra: { canWrite?: () => Promise<boolean> } = {},
) {
  const sent: string[] = [];
  const execute = vi.fn(async (op: PendingOp) => {
    await run(op);
    sent.push(label(op));
  });
  const queue = createPendingQueue({ key: KEY, execute, ...extra });
  return { queue, execute, sent };
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('poison rows: classify the failure', () => {
  it('drops an operation that can never succeed and carries on with the rest', async () => {
    const { queue, sent } = setup((op) =>
      label(op) === 'bad' ? Promise.reject(poison()) : Promise.resolve(),
    );
    await queue.enqueue(lesson('bad'));
    await queue.enqueue(lesson('good'));

    expect(sent).toEqual(['good']);
    expect(queue.size()).toBe(0);
    expect(queue.droppedCount()).toBe(1);
    // The learner is not alarmed: nothing is waiting to be retried.
    expect(queue.syncError()).toBe(false);
  });

  it('a bad row in the middle never blocks what is behind it', async () => {
    let offline = true;
    const { queue, sent } = setup((op) => {
      if (offline) return Promise.reject(down());
      return label(op) === 'bad' ? Promise.reject(poison()) : Promise.resolve();
    });
    await queue.enqueue(lesson('a'));
    await queue.enqueue(lesson('bad'));
    await queue.enqueue(lesson('c'));
    offline = false;

    await queue.flush();

    expect(sent).toEqual(['a', 'c']);
    expect(queue.droppedCount()).toBe(1);
    expect(queue.size()).toBe(0);
  });

  it.each([
    ['500', new RemoteFailure('x', 500, '')],
    ['429', new RemoteFailure('x', 429, '')],
    ['an expired JWT', new RemoteFailure('JWT expired', 401, 'PGRST301')],
    ['a network error', down()],
  ])('keeps the operation on %s', async (_name, error) => {
    const { queue } = setup(() => Promise.reject(error));
    await queue.enqueue(lesson('a'));
    expect(queue.size()).toBe(1);
    expect(queue.droppedCount()).toBe(0);
    expect(queue.syncError()).toBe(true);
  });

  it('reports counts the executor says it dropped inside one operation', async () => {
    const execute = vi.fn(
      (_op: PendingOp, report: { dropped(count: number): void }) => {
        report.dropped(2);
        return Promise.resolve();
      },
    );
    const queue = createPendingQueue({ key: KEY, execute });
    await queue.enqueue(lesson('a'));
    expect(queue.droppedCount()).toBe(2);
  });

  it('does NOT drop a policy violation while a different account is signed in', async () => {
    let owner = false;
    const { queue } = setup(
      () => Promise.reject(new RemoteFailure('rls', 403, '42501')),
      {
        canWrite: () => Promise.resolve(owner),
      },
    );
    owner = true; // at the start of the replay we still look like the owner...
    const sending = queue.enqueue(lesson('a'));
    owner = false; // ...but by the time the answer comes back we are not
    await sending;
    expect(queue.size()).toBe(1);
    expect(queue.droppedCount()).toBe(0);
  });

  it('drops a policy violation when we are still the signed-in account', async () => {
    const { queue } = setup(
      () => Promise.reject(new RemoteFailure('rls', 403, '42501')),
      {
        canWrite: () => Promise.resolve(true),
      },
    );
    await queue.enqueue(lesson('a'));
    expect(queue.size()).toBe(0);
    expect(queue.droppedCount()).toBe(1);
  });

  it('sends nothing, and keeps everything, when another account is signed in', async () => {
    const { queue, execute } = setup(() => Promise.resolve(), {
      canWrite: () => Promise.resolve(false),
    });
    await queue.enqueue(lesson('a'));
    expect(execute).not.toHaveBeenCalled();
    expect(queue.size()).toBe(1);
    expect(queue.syncError()).toBe(true);
  });
});

describe('the queue never grows without bound', () => {
  it('folds repeated writes for one lesson into one while offline', async () => {
    const { queue } = setup(() => Promise.reject(down()));
    await queue.enqueue(lesson('a', opened(T1)));
    for (let i = 0; i < 50; i += 1) {
      await queue.enqueue(
        lesson(
          'b',
          opened(`2026-03-04T10:${String(i).padStart(2, '0')}:00.000Z`),
        ),
      );
    }
    await queue.enqueue(lesson('b', done(T3)));
    // 'a' is the one being retried: it stays; every write for 'b' folds into one.
    expect(queue.pending().map(label)).toEqual(['a', 'b']);
    expect(queue.pending()[1]).toMatchObject({
      record: { status: 'completed' },
    });
  });

  it('does not fold a write into the operation that is in flight', async () => {
    const gate = deferred<undefined>();
    const { queue, sent } = setup(() => gate.promise);
    const first = queue.enqueue(lesson('a', opened(T1)));
    const second = queue.enqueue(lesson('a', done(T2)));
    expect(queue.pending()).toHaveLength(2);
    gate.resolve(undefined);
    await Promise.all([first, second]);
    expect(sent).toEqual(['a', 'a']);
    expect(queue.size()).toBe(0);
  });

  it('never loses a completion to the cap', async () => {
    const { queue } = setup(() => Promise.reject(down()));
    for (let i = 0; i < 40; i += 1)
      await queue.enqueue(lesson(`l${String(i)}`, done(T1)));
    for (let i = 0; i < 600; i += 1) await queue.enqueue(quiz(i, i % 6));
    const lessons = queue.pending().filter((op) => op.kind === 'lesson');
    expect(lessons).toHaveLength(40);
    expect(queue.size()).toBeLessThanOrEqual(500);
    expect(queue.droppedCount()).toBeGreaterThan(0);
    expect(
      Math.max(
        ...queue
          .pending()
          .flatMap((op) => (op.kind === 'quiz' ? [op.score] : [])),
      ),
    ).toBe(5);
  });
});

describe('overlay and subscriptions', () => {
  it('overlays queued writes on a loaded state', async () => {
    const { queue } = setup(() => Promise.reject(down()));
    await queue.enqueue(lesson('a', done(T2)));
    await queue.enqueue(quiz(1, 4));
    const result = queue.overlay(stateOf({ a: opened(T1) }));
    expect(result.lessons.a).toEqual(withQuiz(done(T2), 4, 5));
  });

  it('tells subscribers about changes, and stops after unsubscribe', async () => {
    const { queue } = setup();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    await queue.enqueue(lesson('a'));
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    unsubscribe();
    await queue.enqueue(lesson('b'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('a throwing subscriber does not break the queue', async () => {
    const { queue, sent } = setup();
    queue.subscribe(() => {
      throw new Error('bad listener');
    });
    await queue.enqueue(lesson('a'));
    expect(sent).toEqual(['a']);
  });

  it('syncError clears once the queue has drained', async () => {
    let failing = true;
    const { queue } = setup(() =>
      failing ? Promise.reject(down()) : Promise.resolve(),
    );
    await queue.enqueue(lesson('a'));
    expect(queue.syncError()).toBe(true);
    failing = false;
    await queue.flush();
    expect(queue.syncError()).toBe(false);
  });

  it('does not report an error for work picked up from a past session until a retry has failed', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        ops: [{ seq: 1, kind: 'lesson', id: 'a', record: opened(T1) }],
      }),
    );
    const { queue } = setup();
    expect(queue.size()).toBe(1);
    expect(queue.syncError()).toBe(false);
  });
});
