// The same two-tab race as pendingQueue.rewrite.test.ts, through the real store
// over the fake database, with the server unreachable for both tabs:
//   tab A saves "opened" (key K); tab B is created and picks K up; B completes the
//   lesson (folds into K) and closes; A reopens from its stale view (folds into K);
//   back online, a fresh store must send a COMPLETED lesson, never "in progress".
import { beforeEach, describe, expect, it } from 'vitest';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import { createFakeDb } from '@/test/fakeDb';
import { pendingKeys } from '@/test/pendingStorage';
import { done, opened, T1, T2, T3, withQuiz } from '@/test/progressFixtures';

const U = 'user-1';
const base = pendingKey(U);

function setup() {
  const db = createFakeDb({ userId: U });
  db.setOffline(true);
  const open = () => createSupabaseStore(db.client, U);
  return { db, open };
}
const lessonRow = (db: ReturnType<typeof createFakeDb>, id: string) =>
  db.table('lesson_progress').find((row) => row.lesson_id === id);
const labRow = (db: ReturnType<typeof createFakeDb>, id: string) =>
  db.table('lab_progress').find((row) => row.lab_id === id);

beforeEach(() => {
  window.localStorage.clear();
});

describe('lessons: the completion survives a stale fold, in both directions', () => {
  it('owner then picker: the picker completes and closes, the owner folds a stale reopen', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', opened(T1));
    const picker = open();
    await picker.saveLesson('l1-x', done(T2));
    await owner.saveLesson('l1-x', opened(T3));

    // The picker and the owner are both gone. A fresh store, online:
    db.setOffline(false);
    const fresh = open();
    await fresh.flush();

    expect(lessonRow(db, 'l1-x')).toMatchObject({
      status: 'completed',
      completed_at: T2,
      last_opened_at: T3,
    });
    expect(pendingKeys(base)).toEqual([]);
  });

  it('picker then owner: the owner completes, the picker folds a stale reopen', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', opened(T1));
    const picker = open();
    await owner.saveLesson('l1-x', done(T2));
    await picker.saveLesson('l1-x', opened(T3));

    db.setOffline(false);
    await open().flush();

    expect(lessonRow(db, 'l1-x')).toMatchObject({
      status: 'completed',
      completed_at: T2,
    });
    expect(pendingKeys(base)).toEqual([]);
  });

  it('the tab that folded last sends the completion itself when it reconnects', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', opened(T1));
    const picker = open();
    await picker.saveLesson('l1-x', done(T2));
    await owner.saveLesson('l1-x', opened(T3));

    db.setOffline(false);
    await owner.flush();

    expect(lessonRow(db, 'l1-x')?.status).toBe('completed');
  });

  it('never sends in progress after completed, whichever order the sends happen', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', opened(T1));
    const picker = open();
    await picker.saveLesson('l1-x', done(T2));
    await owner.saveLesson('l1-x', opened(T3));

    db.setOffline(false);
    db.calls.length = 0;
    await Promise.all([owner.flush(), picker.flush()]);

    const sentStatuses = db
      .writes()
      .filter((call) => call.table === 'lesson_progress')
      .map((call) => call.rows[0]?.status);
    expect(sentStatuses.length).toBeGreaterThan(0);
    expect(sentStatuses.every((status) => status === 'completed')).toBe(true);
  });
});

describe('labs', () => {
  it('a completed lab survives a stale started fold, in both directions', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLab('lab-x', { status: 'started' });
    const picker = open();
    await picker.saveLab('lab-x', { status: 'completed', completedAt: T2 });
    await owner.saveLab('lab-x', { status: 'started' });

    const owner2 = open();
    await owner2.saveLab('lab-y', { status: 'started' });
    const picker2 = open();
    await owner2.saveLab('lab-y', { status: 'completed', completedAt: T2 });
    await picker2.saveLab('lab-y', { status: 'started' });

    db.setOffline(false);
    await open().flush();

    expect(labRow(db, 'lab-x')).toMatchObject({
      status: 'completed',
      completed_at: T2,
    });
    expect(labRow(db, 'lab-y')).toMatchObject({
      status: 'completed',
      completed_at: T2,
    });
    expect(pendingKeys(base)).toEqual([]);
  });
});

describe('two tabs sending the same joined key at once', () => {
  it('delivers once, grows nothing, and gives up on nothing', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', opened(T1));
    await owner.recordQuizAttempt('l1-x', 4, 5, T1);
    const picker = open();
    await picker.saveLesson('l1-x', done(T2));

    db.setOffline(false);
    const first = open();
    const second = open();
    await Promise.all([first.flush(), second.flush()]);

    expect(db.table('lesson_progress')).toHaveLength(1);
    expect(lessonRow(db, 'l1-x')?.status).toBe('completed');
    expect(db.table('quiz_attempts')).toHaveLength(1); // the same attempt id, sent twice
    expect(pendingKeys(base)).toEqual([]);
    for (const store of [first, second]) {
      expect(store.droppedCount()).toBe(0);
      expect(store.syncError()).toBe(false);
    }
  });

  it('a quiz score folded with a lesson keeps both after the join', async () => {
    const { db, open } = setup();
    const owner = open();
    await owner.saveLesson('l1-x', withQuiz(opened(T1), 3, 5));
    const picker = open();
    await picker.saveLesson('l1-x', done(T2));
    await owner.recordQuizAttempt('l1-x', 5, 5, T3);
    db.setOffline(false);
    await open().flush();
    expect(lessonRow(db, 'l1-x')?.status).toBe('completed');
    expect(db.table('quiz_attempts')).toHaveLength(1);
  });
});
