// A tab can pick up the keys of a tab that is STILL OPEN (it has no way to know),
// so two live tabs can both hold one key and both fold writes into it. A fold
// rewrites the key, and that rewrite must be a read-modify-write: re-read the
// stored value, join it with this tab's copy, write the join. Otherwise a stale
// fold overwrites a completion the other tab already saved there.
//
//   1. the server is unreachable; tab A saves "opened" under key K;
//   2. tab B is created and picks up K;
//   3. tab B completes the lesson (folds into K) and closes;
//   4. tab A reopens the lesson from its stale view (folds into K);
//   5. back online, the write that is sent must be COMPLETED, never "in progress".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { createPendingQueue } from '@/progress/pendingQueue';
import { RemoteFailure } from '@/progress/remoteFailure';
import { pendingKeys, storedOps } from '@/test/pendingStorage';
import { done, opened, T1, T2, T3 } from '@/test/progressFixtures';

const BASE = 'netsteps.pending.user-1';
const lesson = (id: string, record = opened(T1)): WriteOp => ({
  kind: 'lesson',
  id,
  record,
});
const lab = (
  id: string,
  record: { status: 'started' | 'completed'; completedAt?: string },
): WriteOp => ({
  kind: 'lab',
  id,
  record,
});
const doneLab = { status: 'completed', completedAt: T2 } as const;
const startedLab = { status: 'started' } as const;

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

describe('a fold re-reads and joins what is stored', () => {
  it('owner then picker: the picker completes, then the owner folds a stale reopen', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab(); // picks up the owner's key
    await picker.queue.enqueue(lesson('l1-x', done(T2))); // completes; then it closes
    await owner.queue.enqueue(lesson('l1-x', opened(T3))); // stale reopen

    // The stored write is still the completion (and carries the newer open time).
    expect(pendingKeys(BASE)).toHaveLength(1);
    expect(storedRecords()[0]).toMatchObject({
      status: 'completed',
      completedAt: T2,
      lastOpenedAt: T3,
    });

    // The owner's own copy was brought up to what is stored, so it sends that.
    owner.state.online = true;
    await owner.queue.flush();
    expect(owner.sent).toEqual(['lesson:l1-x:completed']);
    expect(pendingKeys(BASE)).toEqual([]);
  });

  it('owner then picker, and the owner is gone: a fresh store sends the completion', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab();
    await picker.queue.enqueue(lesson('l1-x', done(T2)));
    await owner.queue.enqueue(lesson('l1-x', opened(T3)));

    const fresh = openTab();
    fresh.state.online = true;
    await fresh.queue.flush();
    expect(fresh.sent).toEqual(['lesson:l1-x:completed']);
  });

  it('picker then owner: the owner completes, then the picker folds a stale reopen', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab(); // picks up the key while the owner is still open
    await owner.queue.enqueue(lesson('l1-x', done(T2))); // the owner completes
    await picker.queue.enqueue(lesson('l1-x', opened(T3))); // the picker's stale reopen

    expect(pendingKeys(BASE)).toHaveLength(1);
    expect(storedRecords()[0]).toMatchObject({
      status: 'completed',
      completedAt: T2,
      lastOpenedAt: T3,
    });

    picker.state.online = true;
    await picker.queue.flush();
    expect(picker.sent).toEqual(['lesson:l1-x:completed']);
  });

  it('picker then owner, and both are gone: a fresh store sends the completion', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab();
    await owner.queue.enqueue(lesson('l1-x', done(T2)));
    await picker.queue.enqueue(lesson('l1-x', opened(T3)));

    const fresh = openTab();
    fresh.state.online = true;
    await fresh.queue.flush();
    expect(fresh.sent).toEqual(['lesson:l1-x:completed']);
  });

  it('a lab is joined the same way, in both directions', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lab('lab-x', startedLab));
    const picker = openTab();
    await picker.queue.enqueue(lab('lab-x', doneLab));
    await owner.queue.enqueue(lab('lab-x', startedLab)); // stale

    expect(storedRecords()[0]).toMatchObject(doneLab);
    const fresh = openTab();
    fresh.state.online = true;
    await fresh.queue.flush();
    expect(fresh.sent).toEqual(['lab:lab-x:completed']);

    window.localStorage.clear();
    const owner2 = openTab();
    await owner2.queue.enqueue(lab('lab-y', startedLab));
    const picker2 = openTab();
    await owner2.queue.enqueue(lab('lab-y', doneLab));
    await picker2.queue.enqueue(lab('lab-y', startedLab)); // stale
    expect(storedRecords()[0]).toMatchObject(doneLab);
  });

  it('keeps the best of both when each tab folded something new', async () => {
    const owner = openTab();
    await owner.queue.enqueue(lesson('l1-x', opened(T1)));
    const picker = openTab();
    await picker.queue.enqueue(lesson('l1-x', opened(T2)));
    await owner.queue.enqueue(lesson('l1-x', done(T3)));

    expect(storedRecords()[0]).toMatchObject({
      status: 'completed',
      completedAt: T3,
      lastOpenedAt: T3,
    });
  });
});

describe('a rewrite that cannot join is a new write', () => {
  it('a corrupt value under the key between the read and the rewrite: a new write, the corrupt key left alone', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('l1-x', opened(T1)));
    const [key] = pendingKeys(BASE);
    window.localStorage.setItem(key ?? '', '{not json');

    await tab.queue.enqueue(lesson('l1-x', done(T2)));

    const keys = pendingKeys(BASE);
    expect(keys).toHaveLength(2);
    expect(window.localStorage.getItem(key ?? '')).toBe('{not json');
    expect(storedRecords()).toEqual([
      expect.objectContaining({ status: 'completed' }),
    ]);
  });

  it('a value for a different row under the key is never joined into: a new write', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('l1-x', opened(T1)));
    const [key] = pendingKeys(BASE);
    const foreign = JSON.stringify({
      v: 1,
      op: { kind: 'lesson', id: 'l1-other', record: done(T1) },
    });
    window.localStorage.setItem(key ?? '', foreign);

    await tab.queue.enqueue(lesson('l1-x', done(T2)));

    expect(window.localStorage.getItem(key ?? '')).toBe(foreign);
    const mine = storedOps(BASE).filter((entry) => entry.key !== key);
    expect(mine.map((entry) => entry.op.id)).toEqual(['l1-x']);
    expect(mine[0]?.op.record).toMatchObject({ status: 'completed' });
  });

  it('a lab value for a different lab under the key is never joined into: a new write', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lab('lab-x', startedLab));
    const [key] = pendingKeys(BASE);
    const foreign = JSON.stringify({
      v: 1,
      op: { kind: 'lab', id: 'lab-other', record: doneLab },
    });
    window.localStorage.setItem(key ?? '', foreign);

    await tab.queue.enqueue(lab('lab-x', doneLab));

    expect(window.localStorage.getItem(key ?? '')).toBe(foreign);
    const mine = storedOps(BASE).filter((entry) => entry.key !== key);
    expect(mine.map((entry) => entry.op.id)).toEqual(['lab-x']);
  });

  it('a value of a different kind under the key is never joined into: a new write', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('same', opened(T1)));
    const [key] = pendingKeys(BASE);
    const labValue = JSON.stringify({
      v: 1,
      op: { kind: 'lab', id: 'same', record: doneLab },
    });
    window.localStorage.setItem(key ?? '', labValue);

    await tab.queue.enqueue(lesson('same', done(T2)));

    expect(window.localStorage.getItem(key ?? '')).toBe(labValue);
    expect(pendingKeys(BASE)).toHaveLength(2);
  });

  it('the key removed by another tab: a new write that carries everything this tab holds', async () => {
    const tab = openTab();
    await tab.queue.enqueue(lesson('l1-x', opened(T1)));
    const [key] = pendingKeys(BASE);
    window.localStorage.removeItem(key ?? ''); // the other tab sent it

    await tab.queue.enqueue(lesson('l1-x', done(T2)));

    const keys = pendingKeys(BASE);
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toBe(key);
    expect(storedRecords()[0]).toMatchObject({
      status: 'completed',
      completedAt: T2,
    });
  });

  it('a write that never reached storage is stored when the next fold finds storage working', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    const tab = openTab();
    await expect(tab.queue.enqueue(lesson('l1-x', opened(T1)))).resolves.toBe(
      'unsaved',
    );
    setItem.mockRestore();

    await expect(tab.queue.enqueue(lesson('l1-x', done(T2)))).resolves.toBe(
      'queued',
    );
    expect(storedRecords()[0]).toMatchObject({ status: 'completed' });
  });
});

describe('writes that are only added (quiz attempts, whole-state writes) cannot overwrite anything', () => {
  it('two tabs whose new writes get the same seq both keep their write', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // the same suffix as well
    const tab1 = openTab();
    const tab2 = openTab(); // a fresh tab: the same millisecond, the same counter
    await tab1.queue.enqueue(lesson('from-tab-1', done(T1)));
    await tab2.queue.enqueue(lesson('from-tab-2', done(T2)));
    vi.useRealTimers();

    expect(
      storedOps(BASE)
        .map((entry) => entry.op.id)
        .sort(),
    ).toEqual(['from-tab-1', 'from-tab-2']);
  });
});
