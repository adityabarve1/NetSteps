import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseStore } from '@/progress/supabaseStore';
import { createFakeDb, NETWORK_DOWN, SERVER_NOW } from '@/test/fakeDb';
import type { DbCall } from '@/test/fakeDb';
import { done, opened, T1, T2, T3, withQuiz } from '@/test/progressFixtures';

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
const isWrite = (call: DbCall) => call.kind === 'upsert';

beforeEach(() => {
  window.localStorage.clear();
  counter = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('load', () => {
  it('maps lesson, lab and best quiz rows into a state', async () => {
    const { db, store } = setup();
    db.seed('lesson_progress', [
      {
        user_id: U,
        lesson_id: 'l1-a',
        status: 'completed',
        last_opened_at: '2026-03-02T10:00:00.5+00:00',
        completed_at: '2026-03-03T10:00:00+00:00',
        updated_at: SERVER_NOW,
      },
      {
        user_id: U,
        lesson_id: 'l1-b',
        status: 'in_progress',
        last_opened_at: T1,
        completed_at: null,
        updated_at: SERVER_NOW,
      },
    ]);
    db.seed('lab_progress', [
      {
        user_id: U,
        lab_id: 'lab-a',
        status: 'completed',
        completed_at: T3,
        updated_at: SERVER_NOW,
      },
    ]);
    db.seed('quiz_attempts', [
      {
        id: 'q1',
        user_id: U,
        lesson_id: 'l1-a',
        score: 3,
        total: 5,
        created_at: T1,
      },
      {
        id: 'q2',
        user_id: U,
        lesson_id: 'l1-a',
        score: 5,
        total: 5,
        created_at: T2,
      },
      {
        id: 'q3',
        user_id: U,
        lesson_id: 'l1-a',
        score: 4,
        total: 5,
        created_at: T3,
      },
    ]);

    expect(await store.load()).toEqual({
      lessons: {
        'l1-a': {
          status: 'completed',
          lastOpenedAt: '2026-03-02T10:00:00.500Z',
          completedAt: T3,
          quizBest: { score: 5, total: 5 },
        },
        'l1-b': { status: 'in_progress', lastOpenedAt: T1 },
      },
      labs: { 'lab-a': { status: 'completed', completedAt: T3 } },
    });
  });

  it("asks only for this user's rows and never writes", async () => {
    const { db, store } = setup();
    db.seed('lesson_progress', [
      {
        user_id: 'someone-else',
        lesson_id: 'theirs',
        status: 'completed',
        last_opened_at: T1,
        completed_at: T1,
      },
    ]);
    const state = await store.load();
    expect(state.lessons).toEqual({});
    expect(db.calls.length).toBeGreaterThan(0);
    expect(db.calls.every((call) => call.filters.user_id === U)).toBe(true);
    expect(db.writes()).toHaveLength(0);
    expect(window.localStorage.length).toBe(0);
  });

  it('pages through more than 1000 quiz attempts so the best score is never cut off', async () => {
    const { db, store } = setup();
    const attempts = Array.from({ length: 1005 }, (_, i) => ({
      id: `a-${String(i).padStart(5, '0')}`,
      user_id: U,
      lesson_id: 'l1-a',
      score: i === 1004 ? 5 : 1,
      total: 5,
      created_at: T1,
    }));
    db.seed('quiz_attempts', attempts);
    db.seed('lesson_progress', [
      {
        user_id: U,
        lesson_id: 'l1-a',
        status: 'in_progress',
        last_opened_at: T1,
        completed_at: null,
      },
    ]);

    const state = await store.load();

    expect(state.lessons['l1-a']?.quizBest).toEqual({ score: 5, total: 5 });
    const reads = db.calls.filter((call) => call.table === 'quiz_attempts');
    expect(reads.map((call) => call.range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(reads.every((call) => call.order === 'id')).toBe(true);
  });

  it('asks for one more page when a page is exactly full', async () => {
    const { db, store } = setup();
    db.seed(
      'quiz_attempts',
      Array.from({ length: 1000 }, (_, i) => ({
        id: `a-${String(i).padStart(5, '0')}`,
        user_id: U,
        lesson_id: 'x',
        score: 1,
        total: 5,
      })),
    );
    await store.load();
    expect(
      db.calls.filter((call) => call.table === 'quiz_attempts'),
    ).toHaveLength(2);
  });

  it('fails instead of returning a truncated best score when there is an absurd number of rows', async () => {
    const db = createFakeDb();
    const store = createSupabaseStore(db.client, U, { newId, maxPages: 2 });
    db.seed(
      'quiz_attempts',
      Array.from({ length: 2001 }, (_, i) => ({
        id: `a-${String(i).padStart(5, '0')}`,
        user_id: U,
        lesson_id: 'x',
        score: 1,
        total: 5,
      })),
    );
    await expect(store.load()).rejects.toThrow();
  });

  it('rejects when the remote read fails, so the caller can tell "failed" from "empty"', async () => {
    const { db, store } = setup();
    db.setOffline(true);
    await expect(store.load()).rejects.toThrow();
  });

  it('shows writes that are still waiting in the queue on top of what the server has', async () => {
    const { db, store } = setup();
    db.seed('lesson_progress', [
      {
        user_id: U,
        lesson_id: 'l1-a',
        status: 'in_progress',
        last_opened_at: T1,
        completed_at: null,
      },
    ]);
    db.failNext(NETWORK_DOWN, { times: 99, when: isWrite });
    await store.saveLesson('l1-a', done(T2));
    await store.recordQuizAttempt('l1-a', 4, 5, T2);

    const state = await store.load();

    expect(state.lessons['l1-a']).toEqual(withQuiz(done(T2), 4, 5));
  });
});

describe('writes', () => {
  it('saveLesson upserts on user_id,lesson_id with the signed-in id and no updated_at', async () => {
    const { db, store } = setup();
    await store.saveLesson('l1-a', opened(T1));

    const [call] = upsertsTo(db, 'lesson_progress');
    expect(call?.options).toEqual({ onConflict: 'user_id,lesson_id' });
    expect(call?.rows).toEqual([
      {
        user_id: U,
        lesson_id: 'l1-a',
        status: 'in_progress',
        last_opened_at: T1,
      },
    ]);
    expect(call?.rows[0] && 'updated_at' in call.rows[0]).toBe(false);
  });

  it('opening a lesson again always sends last_opened_at, so it moves on the server', async () => {
    const { db, store } = setup();
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLesson('l1-a', opened(T3));
    expect(db.table('lesson_progress')[0]?.last_opened_at).toBe(T3);
    expect(
      upsertsTo(db, 'lesson_progress').every(
        (c) => 'last_opened_at' in (c.rows[0] ?? {}),
      ),
    ).toBe(true);
  });

  it('opening a completed lesson sends the completion time it already has, and keeps it', async () => {
    const { db, store } = setup();
    await store.saveLesson('l1-a', done(T1));
    await store.saveLesson('l1-a', { ...done(T1), lastOpenedAt: T3 });
    expect(db.table('lesson_progress')[0]).toMatchObject({
      status: 'completed',
      completed_at: T1,
      last_opened_at: T3,
    });
  });

  it('a completed record without a time is sent WITHOUT completed_at; the server fills it', async () => {
    const { db, store } = setup();
    await store.saveLesson('l1-a', { status: 'completed', lastOpenedAt: T1 });
    const [call] = upsertsTo(db, 'lesson_progress');
    expect(call?.rows[0] && 'completed_at' in call.rows[0]).toBe(false);
    expect(db.table('lesson_progress')[0]).toMatchObject({
      status: 'completed',
      completed_at: SERVER_NOW,
    });
  });

  it('saveLab upserts on user_id,lab_id', async () => {
    const { db, store } = setup();
    await store.saveLab('lab-a', { status: 'completed', completedAt: T2 });
    const [call] = upsertsTo(db, 'lab_progress');
    expect(call?.options).toEqual({ onConflict: 'user_id,lab_id' });
    expect(call?.rows).toEqual([
      { user_id: U, lab_id: 'lab-a', status: 'completed', completed_at: T2 },
    ]);
  });

  it('recordQuizAttempt inserts one idempotent row with a client-made id and the action time', async () => {
    const { db, store } = setup();
    await store.recordQuizAttempt('l1-a', 4, 5, T2);

    const [call] = upsertsTo(db, 'quiz_attempts');
    expect(call?.options).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(call?.rows).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        user_id: U,
        lesson_id: 'l1-a',
        score: 4,
        total: 5,
        created_at: T2,
      },
    ]);
    expect(db.table('quiz_attempts')).toHaveLength(1);
  });

  it('writes one row per submit, even for a repeated result', async () => {
    const { db, store } = setup();
    await store.recordQuizAttempt('l1-a', 4, 5, T1);
    await store.recordQuizAttempt('l1-a', 4, 5, T2);
    expect(db.table('quiz_attempts')).toHaveLength(2);
  });

  it('does not write an attempt that cannot be real', async () => {
    const { db, store } = setup();
    await store.recordQuizAttempt('l1-a', 9, 5, T1);
    await store.recordQuizAttempt('l1-a', 1.5, 5, T1);
    await store.recordQuizAttempt('l1-a', 1, 0, T1);
    await store.recordQuizAttempt('l1-a', 1, 5, 'whenever');
    expect(db.calls).toHaveLength(0);
  });
});
