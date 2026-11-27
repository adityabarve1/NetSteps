// Several tabs of one account share one localStorage. The queue keeps ONE KEY PER
// WRITE (`<base>.<seq>`), so a tab only ever adds or removes keys it knows about
// and can never overwrite another tab's writes.
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
const down = () => new RemoteFailure('Failed to fetch', 0, '');
const label = (op: PendingOp) =>
  op.kind === 'lesson' || op.kind === 'lab' ? op.id : op.kind;

// One tab: its own queue over the shared localStorage. `online` decides whether
// its sends work.
function openTab() {
  const state = { online: false };
  const sent: string[] = [];
  const execute = vi.fn((op: PendingOp) => {
    if (!state.online) return Promise.reject(down());
    sent.push(label(op));
    return Promise.resolve();
  });
  return { queue: createPendingQueue({ key: BASE, execute }), state, sent };
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('one key per queued write', () => {
  it('stores each write under its own key, named <base>.<seq>', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('a'));
    await tab.queue.enqueue(lesson('b'));

    const keys = pendingKeys(BASE);
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key).toMatch(
        /^netsteps\.pending\.user-1\.\d{15}-\d{6}-[0-9a-z]{4}$/,
      );
    }
    expect(storedOps(BASE).map((entry) => entry.op.id)).toEqual(['a', 'b']);
  });

  it("removes a write's key only after it was sent", async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('a'));
    expect(pendingKeys(BASE)).toHaveLength(1);
    tab.state.online = true;
    await tab.queue.flush();
    expect(pendingKeys(BASE)).toEqual([]);
  });

  it("folds a repeated write into the earlier write's own key", async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('a', opened(T1)));
    const [first] = pendingKeys(BASE);
    await tab.queue.enqueue(lesson('a', done(T2)));

    expect(pendingKeys(BASE)).toEqual([first]);
    expect(storedOps(BASE)[0]?.op.record).toMatchObject({
      status: 'completed',
      completedAt: T2,
    });
  });

  it('writes a NEW op when the key it would fold into was removed by another tab', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('a', opened(T1)));
    const [first] = pendingKeys(BASE);
    window.localStorage.removeItem(first ?? ''); // another tab delivered it

    await tab.queue.enqueue(lesson('a', done(T2)));

    const keys = pendingKeys(BASE);
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toBe(first);
    expect(storedOps(BASE)[0]?.op.record).toMatchObject({
      status: 'completed',
      completedAt: T2,
    });
  });
});

describe('two tabs of one account never overwrite each other', () => {
  it('both tabs write offline and nothing is lost', async () => {
    const tab1 = openTab();
    const tab2 = openTab();
    await tab1.queue.enqueue(lesson('a-only', done(T1)));
    await tab2.queue.enqueue(lesson('b-only', done(T2)));

    expect(
      storedOps(BASE)
        .map((entry) => entry.op.id)
        .sort(),
    ).toEqual(['a-only', 'b-only']);
  });

  it("one tab draining its queue does not remove the other tab's writes", async () => {
    const tab1 = openTab();
    const tab2 = openTab();
    await tab2.queue.enqueue(lesson('b-only', done(T2))); // tab 2: offline, waiting
    tab1.state.online = true;
    await tab1.queue.enqueue(lesson('a-only', done(T1))); // tab 1: sent at once

    expect(tab1.sent).toEqual(['a-only']);
    expect(storedOps(BASE).map((entry) => entry.op.id)).toEqual(['b-only']);
  });

  it('a tab that closed offline leaves its writes for the next store to replay', async () => {
    const closed = openTab();
    await closed.queue.enqueue(lesson('a', done(T1)));
    await closed.queue.enqueue(lesson('b', done(T2)));

    const next = openTab();
    expect(next.queue.pending().map(label)).toEqual(['a', 'b']);
    next.state.online = true;
    await next.queue.flush();

    expect(next.sent).toEqual(['a', 'b']);
    expect(pendingKeys(BASE)).toEqual([]);
  });

  it('replays writes from several tabs in the order they were made (by seq)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const tab1 = openTab();
    const tab2 = openTab();
    vi.setSystemTime(new Date('2026-06-01T10:00:01.000Z'));
    await tab1.queue.enqueue(lesson('first'));
    vi.setSystemTime(new Date('2026-06-01T10:00:02.000Z'));
    await tab2.queue.enqueue(lesson('second'));
    vi.setSystemTime(new Date('2026-06-01T10:00:03.000Z'));
    await tab1.queue.enqueue(lesson('third'));

    const next = openTab();
    next.state.online = true;
    await next.queue.flush();

    expect(next.sent).toEqual(['first', 'second', 'third']);
  });

  // Inside one store, writes are sent in the order they were added. The seq is
  // what orders them for the NEXT store that reads the keys, so these tests look at
  // what a store created afterwards replays.
  it('a write made after picking up older ones sorts after them, even in the same millisecond', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));
    const earlier = openTab();
    const names = ['one', 'two', 'three', 'four', 'five'];
    for (const name of names) await earlier.queue.enqueue(lesson(name));

    // Same millisecond: the counter must continue after the picked-up writes,
    // not start again from 1 (which would sort the new write among the old ones).
    const next = openTab();
    await next.queue.enqueue(lesson('six'));

    const last = openTab();
    last.state.online = true;
    await last.queue.flush();
    expect(last.sent).toEqual([...names, 'six']);
  });

  it('a write made after picking up newer ones sorts after them, even if the clock went back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T10:00:05.000Z'));
    const earlier = openTab();
    await earlier.queue.enqueue(lesson('made-at-10-00-05'));

    vi.setSystemTime(new Date('2026-06-01T10:00:01.000Z')); // the clock was set back
    const next = openTab();
    await next.queue.enqueue(lesson('made-after'));

    const last = openTab();
    last.state.online = true;
    await last.queue.flush();
    expect(last.sent).toEqual(['made-at-10-00-05', 'made-after']);
  });

  it('writes made in one tab keep their order even if the clock goes back between them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const tab = openTab();
    vi.setSystemTime(new Date('2026-06-01T10:00:05.000Z'));
    await tab.queue.enqueue(lesson('first'));
    vi.setSystemTime(new Date('2026-06-01T10:00:01.000Z'));
    await tab.queue.enqueue(lesson('second'));
    vi.setSystemTime(new Date('2026-06-01T10:00:03.000Z'));
    await tab.queue.enqueue(lesson('third'));

    const next = openTab();
    next.state.online = true;
    await next.queue.flush();
    expect(next.sent).toEqual(['first', 'second', 'third']);
  });

  it('does not remove a key another tab rewrote after this tab read it', async () => {
    const key = seedOp(BASE, seqAt(1000), {
      kind: 'lesson',
      id: 'a',
      record: opened(T1),
    });
    const tab = openTab(); // reads version 1
    tab.state.online = true;
    // Another tab folds a newer record into the same key before this tab is done.
    window.localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        op: { kind: 'lesson', id: 'a', record: done(T3) },
      }),
    );

    await tab.queue.flush();

    expect(tab.sent).toEqual(['a']); // it sent version 1...
    expect(window.localStorage.getItem(key)).not.toBeNull(); // ...but kept version 2
    expect(storedOps(BASE)[0]?.op.record).toMatchObject({
      status: 'completed',
    });
  });
});

describe('what is in storage is validated', () => {
  it('skips a corrupt op key, leaves it alone, and replays the rest', async () => {
    window.localStorage.setItem(`${BASE}.${seqAt(1000)}`, '{not json');
    seedOp(BASE, seqAt(2000), {
      kind: 'lesson',
      id: 'good',
      record: opened(T1),
    });
    seedOp(BASE, seqAt(3000), { kind: 'mystery' });

    const tab = openTab();
    tab.state.online = true;
    await tab.queue.flush();

    expect(tab.sent).toEqual(['good']);
    expect(pendingKeys(BASE)).toHaveLength(2); // the two it could not read, untouched
  });

  it('ignores the old single key without crashing', async () => {
    window.localStorage.setItem(
      BASE,
      JSON.stringify({
        v: 1,
        ops: [{ seq: 1, kind: 'lesson', id: 'legacy', record: opened(T1) }],
      }),
    );
    const tab = openTab();
    tab.state.online = true;

    expect(tab.queue.size()).toBe(0);
    await expect(tab.queue.flush()).resolves.toBeUndefined();
    expect(tab.sent).toEqual([]);
    expect(window.localStorage.getItem(BASE)).not.toBeNull();
  });

  it("never reads another account's keys, even one whose id starts the same", async () => {
    seedOp('netsteps.pending.user-2', seqAt(1000), {
      kind: 'lesson',
      id: 'other',
      record: opened(T1),
    });
    seedOp('netsteps.pending.user-10', seqAt(1000), {
      kind: 'lesson',
      id: 'other-ten',
      record: opened(T1),
    });
    seedOp('netsteps.pending.user-1.x', seqAt(1000), {
      kind: 'lesson',
      id: 'dotted',
      record: opened(T1),
    });
    const tab = openTab();
    tab.state.online = true;
    await tab.queue.flush();
    expect(tab.sent).toEqual([]);
  });

  it('copes with hundreds of unrelated keys and many queued writes', async () => {
    for (let i = 0; i < 400; i += 1) {
      window.localStorage.setItem(`some.other.key.${String(i)}`, 'x');
    }
    for (let i = 0; i < 300; i += 1) {
      seedOp(BASE, seqAt(1000 + i), {
        kind: 'lesson',
        id: `l${String(i)}`,
        record: opened(T1),
      });
    }
    const tab = openTab();
    expect(tab.queue.size()).toBe(300);
    tab.state.online = true;
    await tab.queue.flush();
    expect(tab.sent).toHaveLength(300);
    expect(tab.sent[0]).toBe('l0');
    expect(tab.sent[299]).toBe('l299');
    expect(pendingKeys(BASE)).toEqual([]);
    expect(window.localStorage.length).toBe(400);
  });
});
