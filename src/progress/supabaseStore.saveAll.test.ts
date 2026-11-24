import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import type { ProgressState } from '@/progress/types';
import { createFakeDb, NETWORK_DOWN, SERVER_NOW } from '@/test/fakeDb';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  withQuiz,
} from '@/test/progressFixtures';

// saveAll is how a guest's progress reaches an account (the merge on sign-in).
// A guest keeps only a BEST score, not a list of attempts, so the question is how
// that score becomes quiz_attempts rows exactly once. The rule under test:
//   * saveAll reads the account's own best score first and inserts an attempt
//     only for a lesson whose score is STRICTLY better than what the account has;
//   * the attempt ids are made when the write is queued and are reused on every
//     replay, and the insert is ON CONFLICT DO NOTHING.
// So merging the same guest data again, or replaying a half-finished merge, can
// never add a second row.
const U = 'user-1';
let counter = 0;
const newId = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

function setup() {
  const db = createFakeDb({ userId: U });
  const store = createSupabaseStore(db.client, U, { newId });
  return { db, store };
}
const attemptsOf = (db: ReturnType<typeof createFakeDb>) =>
  db
    .table('quiz_attempts')
    .map(
      (row) =>
        `${String(row.lesson_id)}:${String(row.score)}/${String(row.total)}`,
    );
const writesTo = (db: ReturnType<typeof createFakeDb>, table: string) =>
  db.writes().filter((call) => call.table === table);
const queued = () => {
  const raw = window.localStorage.getItem(pendingKey(U));
  return raw === null ? [] : (JSON.parse(raw) as { ops: unknown[] }).ops;
};

const guest: ProgressState = {
  lessons: {
    'l1-a': withQuiz(done(T1), 4, 5),
    'l1-b': opened(T2),
    'l1-c': withQuiz(opened(T1), 2, 5),
  },
  labs: {
    'lab-a': { status: 'completed', completedAt: T1 },
    'lab-b': { status: 'started' },
  },
};

beforeEach(() => {
  window.localStorage.clear();
  counter = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveAll: lessons and labs', () => {
  it('upserts every lesson and every lab, one request per table', async () => {
    const { db, store } = setup();
    await store.saveAll(guest);

    const lessonCalls = writesTo(db, 'lesson_progress');
    expect(lessonCalls).toHaveLength(1);
    expect(lessonCalls[0]?.options).toEqual({
      onConflict: 'user_id,lesson_id',
    });
    expect(lessonCalls[0]?.rows.map((r) => r.lesson_id).sort()).toEqual([
      'l1-a',
      'l1-b',
      'l1-c',
    ]);
    const labCalls = writesTo(db, 'lab_progress');
    expect(labCalls).toHaveLength(1);
    expect(labCalls[0]?.options).toEqual({ onConflict: 'user_id,lab_id' });
    expect(db.table('lab_progress')).toHaveLength(2);
  });

  it('sends the same columns as a single save: no updated_at, completed_at only when known', async () => {
    const { db, store } = setup();
    await store.saveAll(
      stateOf({
        a: done(T1),
        b: { status: 'completed', lastOpenedAt: T2 },
        c: opened(T1),
      }),
    );
    const rows = writesTo(db, 'lesson_progress')[0]?.rows ?? [];
    expect(rows.some((row) => 'updated_at' in row)).toBe(false);
    expect(rows.find((r) => r.lesson_id === 'b')).toEqual({
      user_id: U,
      lesson_id: 'b',
      status: 'completed',
      last_opened_at: T2,
    });
    expect(
      db.table('lesson_progress').find((r) => r.lesson_id === 'b')
        ?.completed_at,
    ).toBe(SERVER_NOW);
  });

  it('splits a large state into requests of at most 200 rows', async () => {
    const { db, store } = setup();
    const lessons = Object.fromEntries(
      Array.from({ length: 450 }, (_, i) => [`l-${String(i)}`, opened(T1)]),
    );
    await store.saveAll({ lessons, labs: {} });
    expect(writesTo(db, 'lesson_progress').map((c) => c.rows.length)).toEqual([
      200, 200, 50,
    ]);
    expect(db.table('lesson_progress')).toHaveLength(450);
  });

  it('with an empty state sends nothing and resolves', async () => {
    const { db, store } = setup();
    await expect(store.saveAll(stateOf({}))).resolves.toBeUndefined();
    expect(db.writes()).toHaveLength(0);
  });
});

describe('saveAll: a guest quiz score reaches the account exactly once', () => {
  it('inserts one attempt per lesson that has a score, without a made-up time', async () => {
    const { db, store } = setup();
    await store.saveAll(guest);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
    const [call] = writesTo(db, 'quiz_attempts');
    expect(call?.options).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(call?.rows.every((row) => !('created_at' in row))).toBe(true);
  });

  it('merging the same guest data again adds nothing', async () => {
    const { db, store } = setup();
    await store.saveAll(guest);
    await store.saveAll(guest);
    await store.saveAll(guest);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
  });

  it('adds nothing when the account already has an equal or better score', async () => {
    const { db, store } = setup();
    db.seed('quiz_attempts', [
      {
        id: 'r1',
        user_id: U,
        lesson_id: 'l1-a',
        score: 5,
        total: 5,
        created_at: T1,
      },
      {
        id: 'r2',
        user_id: U,
        lesson_id: 'l1-c',
        score: 4,
        total: 10,
        created_at: T1,
      },
    ]);
    await store.saveAll(guest);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:5/5', 'l1-c:4/10']);
  });

  it('adds the guest score only where it beats the account', async () => {
    const { db, store } = setup();
    db.seed('quiz_attempts', [
      {
        id: 'r1',
        user_id: U,
        lesson_id: 'l1-a',
        score: 3,
        total: 5,
        created_at: T1,
      },
      {
        id: 'r2',
        user_id: U,
        lesson_id: 'l1-c',
        score: 5,
        total: 5,
        created_at: T1,
      },
    ]);
    await store.saveAll(guest);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:3/5', 'l1-a:4/5', 'l1-c:5/5']);
  });

  it('treats 3/5 and 6/10 as the same score', async () => {
    const { db, store } = setup();
    db.seed('quiz_attempts', [
      {
        id: 'r1',
        user_id: U,
        lesson_id: 'x',
        score: 6,
        total: 10,
        created_at: T1,
      },
    ]);
    await store.saveAll(stateOf({ x: withQuiz(opened(T1), 3, 5) }));
    expect(db.table('quiz_attempts')).toHaveLength(1);
  });

  it("reads the account's best across more than one page of attempts", async () => {
    const { db, store } = setup();
    db.seed(
      'quiz_attempts',
      Array.from({ length: 1005 }, (_, i) => ({
        id: `a-${String(i).padStart(5, '0')}`,
        user_id: U,
        lesson_id: 'x',
        score: i === 1004 ? 5 : 1,
        total: 5,
      })),
    );
    await store.saveAll(stateOf({ x: withQuiz(opened(T1), 5, 5) }));
    expect(db.table('quiz_attempts')).toHaveLength(1005);
  });

  it('replaying a half-finished merge adds each attempt once', async () => {
    const { db, store } = setup();
    // The lessons go through, then the attempt insert is refused once.
    db.failNext(NETWORK_DOWN, {
      when: (c) => c.table === 'quiz_attempts' && c.kind === 'upsert',
    });
    await store.saveAll(guest);
    expect(store.syncError()).toBe(true);
    expect(db.table('lesson_progress')).toHaveLength(3);
    expect(db.table('quiz_attempts')).toHaveLength(0);

    // Back online: the saved operation is replayed from the top.
    await store.flush();
    await store.flush();

    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
    expect(db.table('lesson_progress')).toHaveLength(3);
    expect(store.syncError()).toBe(false);
  });

  it('replaying a merge whose attempt insert DID reach the server adds nothing more', async () => {
    const { db, store } = setup();
    db.failNext(NETWORK_DOWN, {
      applyFirst: true,
      when: (c) => c.table === 'quiz_attempts' && c.kind === 'upsert',
    });
    await store.saveAll(guest);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
    expect(store.syncError()).toBe(true);

    await store.flush();

    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
    expect(store.syncError()).toBe(false);
  });

  it('reuses the attempt ids it made when the write was queued', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await store.saveAll(guest);
    const op = queued()[0] as {
      kind: string;
      attemptIds: Record<string, string>;
    };
    expect(op.kind).toBe('all');
    expect(Object.keys(op.attemptIds).sort()).toEqual(['l1-a', 'l1-c']);

    db.setOffline(false);
    await store.flush();
    const sent = writesTo(db, 'quiz_attempts')[0]
      ?.rows.map((r) => r.id)
      .sort();
    expect(sent).toEqual(Object.values(op.attemptIds).sort());
  });
});

describe('saveAll: failures', () => {
  it('queues the whole merge when the network is down, and finishes it later', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await expect(store.saveAll(guest)).resolves.toBeUndefined();
    expect(queued()).toHaveLength(1);

    db.setOffline(false);
    await store.flush();

    expect(db.table('lesson_progress')).toHaveLength(3);
    expect(db.table('lab_progress')).toHaveLength(2);
    expect(attemptsOf(db).sort()).toEqual(['l1-a:4/5', 'l1-c:2/5']);
    expect(queued()).toEqual([]);
  });

  it('drops only the bad row of a batch, keeps the good ones, and does not retry forever', async () => {
    const { db, store } = setup();
    await store.saveAll(
      stateOf({
        good1: opened(T1),
        ['z'.repeat(101)]: opened(T1),
        good2: done(T2),
      }),
    );

    expect(
      db
        .table('lesson_progress')
        .map((r) => r.lesson_id)
        .sort(),
    ).toEqual(['good1', 'good2']);
    expect(store.droppedCount()).toBe(1);
    expect(store.syncError()).toBe(false);
    expect(queued()).toEqual([]);
  });

  it('rejects, so the caller keeps the guest data, when the write failed and could not be saved either', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(store.saveAll(guest)).rejects.toThrow();
  });

  it('resolves, because the work is safe, when it was queued in storage', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await expect(store.saveAll(guest)).resolves.toBeUndefined();
  });
});
