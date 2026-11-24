// Removing a key after its write was sent: only if nobody changed it, or the send
// covers the change. And two tabs sending the same joined key at once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { createPendingQueue } from '@/progress/pendingQueue';
import { RemoteFailure } from '@/progress/remoteFailure';
import { pendingKeys, seedOp, seqAt, storedOps } from '@/test/pendingStorage';
import { done, opened, T1, T2, T3 } from '@/test/progressFixtures';

const BASE = 'netsteps.pending.user-1';
const lesson = (id: string, record = opened(T1)): WriteOp => ({
  kind: 'lesson',
  id,
  record,
});
// What a send looked like: "lesson:l1-x:completed".
const described = (op: PendingOp) =>
  op.kind === 'lesson' || op.kind === 'lab'
    ? `${op.kind}:${op.id}:${op.record.status}`
    : op.kind;

function openTab() {
  const state = { online: false };
  const sent: string[] = [];
  const execute = vi.fn((op: PendingOp) => {
    if (!state.online) return Promise.reject(new RemoteFailure('down', 0, ''));
    sent.push(described(op));
    return Promise.resolve();
  });
  return { queue: createPendingQueue({ key: BASE, execute }), state, sent };
}
const storedRecords = () => storedOps(BASE).map((entry) => entry.op.record);

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('removing a key after a send never removes what the send did not cover', () => {
  it('another tab joined a newer write into the key meanwhile: the key stays, with the newer value', async () => {
    const key = seedOp(BASE, seqAt(1000), {
      kind: 'lesson',
      id: 'a',
      record: opened(T1),
    });
    const tab = openTab(); // reads the opened version
    tab.state.online = true;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        op: { kind: 'lesson', id: 'a', record: done(T3) },
      }),
    );

    await tab.queue.flush();

    expect(tab.sent).toEqual(['lesson:a:in_progress']);
    expect(storedRecords()).toEqual([
      expect.objectContaining({ status: 'completed' }),
    ]);
  });

  it('the other tab folded something that adds nothing: the send covers it, so the key goes', async () => {
    const key = seedOp(BASE, seqAt(1000), {
      kind: 'lesson',
      id: 'a',
      record: done(T2),
    });
    const tab = openTab();
    tab.state.online = true;
    // A stale fold rewrote the key with the same meaning (different field order).
    window.localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        op: {
          kind: 'lesson',
          id: 'a',
          record: { completedAt: T2, lastOpenedAt: T2, status: 'completed' },
        },
      }),
    );

    await tab.queue.flush();

    expect(tab.sent).toEqual(['lesson:a:completed']);
    expect(pendingKeys(BASE)).toEqual([]);
  });

  it("the other tab folded a different row's write into the key: it is not removed", async () => {
    const key = seedOp(BASE, seqAt(1000), {
      kind: 'lesson',
      id: 'a',
      record: done(T2),
    });
    const tab = openTab();
    tab.state.online = true;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        op: { kind: 'lesson', id: 'b', record: done(T2) },
      }),
    );
    await tab.queue.flush();
    expect(pendingKeys(BASE)).toEqual([key]);
  });
});

describe('two tabs sending the same joined key at once', () => {
  it('both send it, the key goes once, nothing grows and nothing is given up on', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab();
    await picker.queue.enqueue(lesson('l1-x', done(T2)));
    const sizeBefore = pendingKeys(BASE).length;

    // Two fresh tabs pick up the one joined key and flush at the same moment.
    const first = openTab();
    const second = openTab();
    first.state.online = true;
    second.state.online = true;
    await Promise.all([first.queue.flush(), second.queue.flush()]);

    expect(sizeBefore).toBe(1);
    expect(first.sent).toEqual(['lesson:l1-x:completed']);
    expect(second.sent).toEqual(['lesson:l1-x:completed']);
    expect(pendingKeys(BASE)).toEqual([]);
    expect(first.queue.droppedCount()).toBe(0);
    expect(second.queue.droppedCount()).toBe(0);
    expect(first.queue.syncError()).toBe(false);
    expect(second.queue.syncError()).toBe(false);
  });
});
