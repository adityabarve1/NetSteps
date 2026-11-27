import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { createPendingQueue } from '@/progress/pendingQueue';
import { RemoteFailure } from '@/progress/remoteFailure';
import { pendingKeys, seedOp, seqAt, storedOps } from '@/test/pendingStorage';
import { done, opened, T1, T2 } from '@/test/progressFixtures';
import { deferred } from '@/test/fakeSupabase';

const KEY = 'netsteps.pending.user-1';
const lesson = (id: string, record = opened(T1)): WriteOp => ({
  kind: 'lesson',
  id,
  record,
});
const down = () => new RemoteFailure('Failed to fetch', 0, '');
const label = (op: PendingOp) =>
  op.kind === 'lesson' || op.kind === 'lab' ? op.id : op.kind;
// What is waiting in storage, one key per write, in the order they were made.
const persisted = (): string[] =>
  storedOps(KEY).map((entry) => String(entry.op.id ?? entry.op.kind));

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

describe('writing through the queue', () => {
  it('saves the operation to storage BEFORE sending it, and removes it once sent', async () => {
    let seenWhileSending: string[] = [];
    const { queue, sent } = setup(() => {
      seenWhileSending = persisted();
      return Promise.resolve();
    });

    await expect(queue.enqueue(lesson('a'))).resolves.toBe('done');

    expect(seenWhileSending).toEqual(['a']);
    expect(sent).toEqual(['a']);
    expect(pendingKeys(KEY)).toEqual([]);
    expect(queue.size()).toBe(0);
    expect(queue.syncError()).toBe(false);
  });

  it('keeps a failed operation, reports syncError, and never rejects', async () => {
    const { queue } = setup(() => Promise.reject(down()));

    await expect(queue.enqueue(lesson('a'))).resolves.toBe('queued');

    expect(queue.size()).toBe(1);
    expect(queue.syncError()).toBe(true);
    expect(persisted()).toEqual(['a']);
  });

  it('copes with a thrown non-error and a synchronous throw', async () => {
    const execute = vi
      .fn<(op: PendingOp) => Promise<void>>()
      .mockImplementationOnce(() => {
        throw new Error('sync boom');
      })
      .mockRejectedValueOnce('a string');
    const queue = createPendingQueue({ key: KEY, execute });

    await expect(queue.enqueue(lesson('a'))).resolves.toBe('queued');
    await expect(queue.flush()).resolves.toBeUndefined();
    expect(queue.size()).toBe(1);
  });

  it('flush replays in order, removing each operation only after it was sent', async () => {
    let failing = true;
    const { queue, sent } = setup((op) =>
      failing && label(op) === 'b' ? Promise.reject(down()) : Promise.resolve(),
    );
    await queue.enqueue(lesson('a'));
    await queue.enqueue(lesson('b'));
    await queue.enqueue(lesson('c'));

    // a went out, b failed, c was never tried: the failure keeps the rest.
    expect(sent).toEqual(['a']);
    expect(persisted()).toEqual(['b', 'c']);
    expect(queue.syncError()).toBe(true);

    failing = false;
    await queue.flush();

    expect(sent).toEqual(['a', 'b', 'c']);
    expect(pendingKeys(KEY)).toEqual([]);
    expect(queue.syncError()).toBe(false);
  });

  it('a new write while earlier ones are waiting goes behind them, in order', async () => {
    let failing = true;
    const { queue, sent } = setup(() =>
      failing ? Promise.reject(down()) : Promise.resolve(),
    );
    await queue.enqueue(lesson('a'));
    await queue.enqueue(lesson('b'));
    failing = false;
    await queue.enqueue(lesson('c'));
    expect(sent).toEqual(['a', 'b', 'c']);
  });

  it('flush on an empty queue does nothing', async () => {
    const { queue, execute } = setup();
    await queue.flush();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('RF3: single flight', () => {
  it('never runs two replays at once, and every caller waits for the same one', async () => {
    const gate = deferred<undefined>();
    let running = 0;
    let most = 0;
    const { queue, sent } = setup(async () => {
      running += 1;
      most = Math.max(most, running);
      await gate.promise;
      running -= 1;
    });
    const first = queue.enqueue(lesson('a'));
    const second = queue.enqueue(lesson('b'));
    const third = queue.flush();
    const fourth = queue.flush();

    gate.resolve(undefined);
    await Promise.all([first, second, third, fourth]);

    expect(most).toBe(1);
    expect(sent).toEqual(['a', 'b']);
  });

  it('sends a write that arrives while a replay is running, in the same replay', async () => {
    const gate = deferred<undefined>();
    const { queue, sent, execute } = setup((op) =>
      label(op) === 'a' ? gate.promise : Promise.resolve(),
    );
    const first = queue.enqueue(lesson('a'));
    const second = queue.enqueue(lesson('b'));
    gate.resolve(undefined);
    await Promise.all([first, second]);
    expect(sent).toEqual(['a', 'b']);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('can start again after a replay ended', async () => {
    const { queue, sent } = setup();
    await queue.enqueue(lesson('a'));
    await queue.enqueue(lesson('b'));
    expect(sent).toEqual(['a', 'b']);
  });
});

describe('RF3: persistence of the queue itself', () => {
  it('keeps the queue in memory when storage refuses it, and still replays it', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    let failing = true;
    const { queue, sent } = setup(() =>
      failing ? Promise.reject(down()) : Promise.resolve(),
    );

    await expect(queue.enqueue(lesson('a'))).resolves.toBe('unsaved');
    expect(queue.size()).toBe(1);

    failing = false;
    await queue.flush();
    expect(sent).toEqual(['a']);
  });

  it('survives a reload: a new queue on the same key picks the work up', async () => {
    const first = setup(() => Promise.reject(down()));
    await first.queue.enqueue(lesson('a', done(T2)));

    const second = setup();
    expect(second.queue.pending().map(label)).toEqual(['a']);
    await second.queue.flush();
    expect(second.sent).toEqual(['a']);
    expect(pendingKeys(KEY)).toEqual([]);
  });

  it('numbers new operations after the ones it picked up', async () => {
    const first = setup(() => Promise.reject(down()));
    await first.queue.enqueue(lesson('a'));
    await first.queue.enqueue(lesson('b'));

    const second = setup(() => Promise.reject(down()));
    await second.queue.enqueue(lesson('c'));
    const seqs = second.queue.pending().map((op) => op.seq);
    expect(new Set(seqs).size).toBe(3);
  });

  it('ignores a damaged stored write and keeps the good ones', async () => {
    seedOp(KEY, seqAt(1000), { kind: 'nonsense' });
    seedOp(KEY, seqAt(2000), { kind: 'lesson', id: 'ok', record: opened(T1) });
    const { queue, sent } = setup();
    await queue.flush();
    expect(sent).toEqual(['ok']);
  });

  it("never reads another account's queue", async () => {
    seedOp('netsteps.pending.someone-else', seqAt(1000), {
      kind: 'lesson',
      id: 'theirs',
      record: opened(T1),
    });
    const { queue, execute } = setup();
    await queue.flush();
    expect(execute).not.toHaveBeenCalled();
  });
});
