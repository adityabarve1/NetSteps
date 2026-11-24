import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import { createFakeDb, NETWORK_DOWN } from '@/test/fakeDb';
import { pendingKeys, storedOps } from '@/test/pendingStorage';
import { done, opened, T1, T2, T3 } from '@/test/progressFixtures';

const U = 'user-1';
let counter = 0;
const newId = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

function setup(userId = U) {
  const db = createFakeDb({ userId });
  const store = createSupabaseStore(db.client, userId, { newId });
  return { db, store };
}
const upsertsTo = (db: ReturnType<typeof createFakeDb>, table: string) =>
  db.writes().filter((call) => call.table === table);
// The writes waiting in storage (one key each), without their seq.
const queued = (userId = U) =>
  storedOps(pendingKey(userId)).map((entry) => entry.op);

beforeEach(() => {
  window.localStorage.clear();
  counter = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('RF3: failed writes are queued, never lost, never thrown', () => {
  it('queues a write the network refused, under its own netsteps.pending.<userId>.<seq> key', async () => {
    const { db, store } = setup();
    db.setOffline(true);

    await expect(store.saveLesson('l1-a', done(T1))).resolves.toBeUndefined();

    expect(store.syncError()).toBe(true);
    expect(queued()).toHaveLength(1);
    expect(pendingKeys('netsteps.pending.user-1')).toHaveLength(1);
    expect(pendingKeys('netsteps.pending.user-1')[0]).toMatch(
      /^netsteps\.pending\.user-1\.\d{15}-\d{6}-[0-9a-z]{4}$/,
    );
  });

  it('flush replays the queue in order and clears it', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLab('lab-a', { status: 'started' });
    await store.recordQuizAttempt('l1-a', 3, 5, T2);
    await store.saveLesson('l1-b', opened(T2));
    db.calls.length = 0;
    db.setOffline(false);

    await store.flush();

    expect(
      db
        .writes()
        .map(
          (c) =>
            `${c.table}:${String(c.rows[0]?.lesson_id ?? c.rows[0]?.lab_id)}`,
        ),
    ).toEqual([
      'lesson_progress:l1-a',
      'lab_progress:lab-a',
      'quiz_attempts:l1-a',
      'lesson_progress:l1-b',
    ]);
    expect(queued()).toEqual([]);
    expect(pendingKeys(pendingKey(U))).toEqual([]);
    expect(store.syncError()).toBe(false);
    expect(db.table('lesson_progress')).toHaveLength(2);
  });

  it('a retried quiz attempt is never duplicated, even when the first try DID reach the server', async () => {
    const { db, store } = setup();
    db.failNext(NETWORK_DOWN, {
      applyFirst: true,
      when: (c) => c.table === 'quiz_attempts',
    });

    await store.recordQuizAttempt('l1-a', 4, 5, T1);
    expect(db.table('quiz_attempts')).toHaveLength(1);
    expect(store.syncError()).toBe(true);

    await store.flush();

    expect(db.table('quiz_attempts')).toHaveLength(1);
    const sentIds = upsertsTo(db, 'quiz_attempts').map((c) => c.rows[0]?.id);
    expect(new Set(sentIds).size).toBe(1);
    expect(store.syncError()).toBe(false);
  });

  it('keeps the same attempt id in the queue as it sent', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.recordQuizAttempt('l1-a', 4, 5, T1);
    const op = queued()[0] as { attemptId?: string };
    expect(op.attemptId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('catches a client that throws instead of answering', async () => {
    const db = createFakeDb();
    const broken = {
      from: () => {
        throw new Error('client exploded');
      },
      auth: db.client.auth,
    } as unknown as typeof db.client;
    const store = createSupabaseStore(broken, U, { newId });
    await expect(store.saveLesson('l1-a', opened(T1))).resolves.toBeUndefined();
    expect(store.syncError()).toBe(true);
  });

  it('survives a reload: a new store on the same account sends what was waiting', async () => {
    const first = setup();
    first.db.setOffline(true);
    await first.store.saveLesson('l1-a', done(T2));

    const second = setup();
    await second.store.flush();

    expect(second.db.table('lesson_progress')[0]).toMatchObject({
      lesson_id: 'l1-a',
      status: 'completed',
    });
    expect(queued()).toEqual([]);
  });

  it("a second account never sees or sends the first account's queue", async () => {
    const a = setup('user-a');
    a.db.setOffline(true);
    await a.store.saveLesson('a-secret', done(T1));

    const b = setup('user-b');
    await b.store.flush();

    expect(b.db.calls).toHaveLength(0);
    expect((await b.store.load()).lessons).toEqual({});
    expect(pendingKeys(pendingKey('user-a'))).toHaveLength(1);
  });

  it('folds repeated offline writes for one lesson into one queued write', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLesson('l1-b', opened(T1));
    await store.saveLesson('l1-b', opened(T2));
    await store.saveLesson('l1-b', done(T3));
    expect(queued()).toHaveLength(2);
  });
});

describe('poison rows and the wrong account', () => {
  it('drops a write the database will never accept, counts it, and does not alarm', async () => {
    const { db, store } = setup();
    await store.saveLesson('x'.repeat(101), opened(T1));
    await store.saveLesson('l1-ok', opened(T1));

    expect(store.droppedCount()).toBe(1);
    expect(store.syncError()).toBe(false);
    expect(queued()).toEqual([]);
    expect(db.table('lesson_progress').map((r) => r.lesson_id)).toEqual([
      'l1-ok',
    ]);
  });

  it('a bad write waiting behind a good one does not stop the rest', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLesson('y'.repeat(101), opened(T1));
    await store.saveLesson('l1-c', opened(T1));
    db.setOffline(false);

    await store.flush();

    expect(db.table('lesson_progress').map((r) => r.lesson_id)).toEqual([
      'l1-a',
      'l1-c',
    ]);
    expect(store.droppedCount()).toBe(1);
    expect(queued()).toEqual([]);
  });

  it('keeps everything and sends nothing while a different account is signed in', async () => {
    const { db, store } = setup();
    db.setSignedInAs('user-2');
    await store.saveLesson('l1-a', done(T1));

    expect(db.writes()).toHaveLength(0);
    expect(store.droppedCount()).toBe(0);
    expect(queued()).toHaveLength(1);

    db.setSignedInAs(U);
    await store.flush();
    expect(db.table('lesson_progress')).toHaveLength(1);
    expect(queued()).toEqual([]);
  });

  it('keeps everything while nobody is signed in', async () => {
    const { db, store } = setup();
    db.setSignedInAs(null);
    await store.saveLab('lab-a', { status: 'started' });
    expect(db.writes()).toHaveLength(0);
    expect(store.syncError()).toBe(true);
  });
});

describe('flush is single flight', () => {
  it('two flushes at once never replay at once', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLesson('l1-b', opened(T1));
    db.setOffline(false);
    const release = db.hold();

    const both = Promise.all([store.flush(), store.flush(), store.flush()]);
    release();
    await both;

    expect(db.mostConcurrentCalls()).toBe(1);
    expect(db.table('lesson_progress')).toHaveLength(2);
  });

  it('tells subscribers when the state of the queue changes', async () => {
    const { db, store } = setup();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    db.setOffline(true);
    await store.saveLesson('l1-a', opened(T1));
    expect(listener).toHaveBeenCalled();
    stop();
    listener.mockClear();
    db.setOffline(false);
    await store.flush();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('requests that never answer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up after 20 seconds, keeps the write, and frees the queue for the next try', async () => {
    vi.useFakeTimers();
    const { db, store } = setup();
    const release = db.hold();

    const saving = store.saveLesson('l1-a', done(T1));
    await vi.advanceTimersByTimeAsync(19_999);
    expect(store.syncError()).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await saving;

    expect(store.syncError()).toBe(true);
    expect(queued()).toHaveLength(1);
    release();
    await store.flush();
    expect(db.table('lesson_progress')).toHaveLength(1);
    expect(store.syncError()).toBe(false);
  });

  it('leaves no timer running once a request has finished', async () => {
    vi.useFakeTimers();
    const { store } = setup();
    await store.saveLesson('l1-a', done(T1));
    await store.load();
    expect(vi.getTimerCount()).toBe(0);
  });
});
