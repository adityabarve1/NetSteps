// Two tabs of one browser are two stores over the same fake database and the
// same localStorage. Supabase announces a sign-in to EVERY open tab, so every
// tab that holds the guest progress runs the merge.
import { beforeEach, describe, expect, it } from 'vitest';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import { createFakeDb } from '@/test/fakeDb';
import { pendingKeys, storedOps } from '@/test/pendingStorage';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  withQuiz,
} from '@/test/progressFixtures';

const U = 'user-1';
const pendingBase = pendingKey(U);

// No injected id maker: the real random ids are used for ordinary submits.
function twoTabs() {
  const db = createFakeDb({ userId: U });
  return {
    db,
    tab1: createSupabaseStore(db.client, U),
    tab2: createSupabaseStore(db.client, U),
  };
}
const attempts = (db: ReturnType<typeof createFakeDb>) =>
  db
    .table('quiz_attempts')
    .map(
      (row) =>
        `${String(row.lesson_id)}:${String(row.score)}/${String(row.total)}`,
    )
    .sort();

const guest = stateOf({
  'l1-a': withQuiz(done(T1), 4, 5),
  'l1-b': withQuiz(opened(T2), 2, 3),
  'l1-c': done(T1), // no score: nothing to add
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('a guest score reaches the account once, even when two tabs merge it', () => {
  it('two tabs merging at the same moment add one attempt per scored lesson', async () => {
    const { db, tab1, tab2 } = twoTabs();
    await Promise.all([tab1.saveAll(guest), tab2.saveAll(guest)]);
    expect(attempts(db)).toEqual(['l1-a:4/5', 'l1-b:2/3']);
  });

  it('two tabs merging one after the other add one attempt per scored lesson', async () => {
    const { db, tab1, tab2 } = twoTabs();
    await tab1.saveAll(guest);
    await tab2.saveAll(guest);
    expect(attempts(db)).toEqual(['l1-a:4/5', 'l1-b:2/3']);
  });

  it('three tabs, merging twice each, still add one', async () => {
    const { db, tab1, tab2 } = twoTabs();
    const tab3 = createSupabaseStore(db.client, U);
    await Promise.all([
      tab1.saveAll(guest),
      tab2.saveAll(guest),
      tab3.saveAll(guest),
    ]);
    await Promise.all([
      tab1.saveAll(guest),
      tab2.saveAll(guest),
      tab3.saveAll(guest),
    ]);
    expect(attempts(db)).toEqual(['l1-a:4/5', 'l1-b:2/3']);
  });

  it("a merge that finds the other tab's attempt not yet visible adds the same row, not another", async () => {
    const { db, tab1, tab2 } = twoTabs();
    // Make the two attempt reads happen before either insert.
    const release = db.hold();
    const both = Promise.all([tab1.saveAll(guest), tab2.saveAll(guest)]);
    release();
    await both;
    expect(attempts(db)).toEqual(['l1-a:4/5', 'l1-b:2/3']);
  });

  it('the merge id is the same for the same score, and the row id is stable across tabs', async () => {
    const { db, tab1, tab2 } = twoTabs();
    await tab1.saveAll(guest);
    const first = db
      .table('quiz_attempts')
      .map((row) => row.id)
      .sort();
    await tab2.saveAll(guest);
    expect(
      db
        .table('quiz_attempts')
        .map((row) => row.id)
        .sort(),
    ).toEqual(first);
  });

  it('an ordinary quiz submit still gets its own random id every time', async () => {
    const { db, tab1 } = twoTabs();
    await tab1.recordQuizAttempt('l1-a', 4, 5, T1);
    await tab1.recordQuizAttempt('l1-a', 4, 5, T1);
    const ids = db.table('quiz_attempts').map((row) => row.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('a later, better score from the same guest is added, and only that one', async () => {
    const { db, tab1, tab2 } = twoTabs();
    await tab1.saveAll(stateOf({ 'l1-a': withQuiz(opened(T1), 3, 5) }));
    await Promise.all([
      tab1.saveAll(stateOf({ 'l1-a': withQuiz(opened(T1), 5, 5) })),
      tab2.saveAll(stateOf({ 'l1-a': withQuiz(opened(T1), 5, 5) })),
    ]);
    expect(attempts(db)).toEqual(['l1-a:3/5', 'l1-a:5/5']);
  });
});

describe('offline writes from two tabs both survive a closed tab (RF3)', () => {
  it('a completion made in each tab while offline is delivered by the next store', async () => {
    const { db, tab1, tab2 } = twoTabs();
    db.setOffline(true);
    await tab1.saveLesson('l1-a', done(T1));
    await tab2.saveLesson('l1-b', done(T2));
    // Both tabs close before the network comes back. A new visit starts a store.
    db.setOffline(false);
    const next = createSupabaseStore(db.client, U);
    await next.flush();

    expect(
      db
        .table('lesson_progress')
        .map((row) => row.lesson_id)
        .sort(),
    ).toEqual(['l1-a', 'l1-b']);
    expect(pendingKeys(pendingBase)).toEqual([]);
  });

  it('one tab sending its writes leaves the writes waiting in the other tab in storage', async () => {
    const { db, tab1, tab2 } = twoTabs();
    db.setOffline(true);
    await tab2.saveLesson('l1-b', done(T2));
    db.setOffline(false);
    await tab1.saveLesson('l1-a', done(T1));

    expect(db.table('lesson_progress').map((row) => row.lesson_id)).toEqual([
      'l1-a',
    ]);
    expect(storedOps(pendingBase).map((entry) => entry.op.id)).toEqual([
      'l1-b',
    ]);
  });
});
