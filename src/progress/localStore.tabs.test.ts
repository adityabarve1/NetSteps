// Two browser tabs are two stores over the same localStorage. A guest has no
// database to protect a completion from a stale write, so the local store itself
// must JOIN every save with what is already stored: a tab that still shows an old
// "in progress" record must never turn a completion made in the other tab back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from '@/progress/localStore';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const stored = () => createLocalStore().load();

describe('lessons: a stale tab never undoes a completion', () => {
  it('keeps the completion when the other tab reopens the lesson afterwards', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab2.saveLesson('l1-a', opened(T1)); // tab 2 has the lesson open
    await tab1.saveLesson('l1-a', done(T2)); // tab 1 completes it
    await tab2.saveLesson('l1-a', opened(T3)); // tab 2 reopens it, from its stale view

    expect((await stored()).lessons['l1-a']).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T2,
    });
  });

  it('keeps the completion when the other tab saves after a quiz submit', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab2.saveLesson('l1-a', opened(T1));
    await tab1.saveLesson('l1-a', done(T2));
    await tab2.saveLesson('l1-a', withQuiz(opened(T1), 3, 5));

    expect((await stored()).lessons['l1-a']).toMatchObject({
      status: 'completed',
      completedAt: T2,
      quizBest: { score: 3, total: 5 },
    });
  });

  it('keeps the better quiz score, whichever tab saved it', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab1.saveLesson('l1-a', withQuiz(opened(T1), 5, 5));
    await tab2.saveLesson('l1-a', withQuiz(opened(T2), 2, 5));
    await tab2.saveLesson('l1-a', opened(T3)); // no score at all

    expect((await stored()).lessons['l1-a']?.quizBest).toEqual({
      score: 5,
      total: 5,
    });
  });

  it('keeps the earlier completion time', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab1.saveLesson('l1-a', done(T1));
    await tab2.saveLesson('l1-a', done(T3));
    expect((await stored()).lessons['l1-a']?.completedAt).toBe(T1);
  });

  it('keeps lessons the other tab saved', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab1.saveLesson('l1-a', done(T1));
    await tab2.saveLesson('l1-b', opened(T2));
    expect(Object.keys((await stored()).lessons).sort()).toEqual([
      'l1-a',
      'l1-b',
    ]);
  });
});

describe('labs and whole-state saves', () => {
  it('a stale tab never turns a completed lab back into started', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab2.saveLab('lab-a', { status: 'started' });
    await tab1.saveLab('lab-a', { status: 'completed', completedAt: T2 });
    await tab2.saveLab('lab-a', { status: 'started' });

    expect((await stored()).labs['lab-a']).toEqual({
      status: 'completed',
      completedAt: T2,
    });
  });

  it('saveAll joins with what is stored instead of replacing it', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab1.saveLesson('l1-a', done(T2));
    await tab1.saveLesson('l1-keep', opened(T1));
    await tab2.saveAll(stateOf({ 'l1-a': opened(T3) }));

    const state = await stored();
    expect(state.lessons['l1-a']?.status).toBe('completed');
    expect(state.lessons['l1-keep']).toEqual(opened(T1));
  });
});

describe('what the other tab wrote is visible without reloading', () => {
  it('load shows a save made by the other tab', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab2.load();
    await tab1.saveLesson('l1-a', done(T1));
    expect((await tab2.load()).lessons['l1-a']).toEqual(done(T1));
  });

  it('load itself still never writes', async () => {
    const tab1 = createLocalStore();
    await tab1.saveLesson('l1-a', done(T1));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await createLocalStore().load();
    await tab1.load();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('RF2 still holds when the browser refuses a write', () => {
  it('joins what is held in memory with what is stored, never replaces it', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    await tab1.saveLesson('l1-a', done(T2));

    // Tab 2 cannot write (quota). Its view of the lesson is stale.
    const quota = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    await expect(tab2.saveLesson('l1-a', opened(T3))).resolves.toBeUndefined();
    await expect(tab2.saveLesson('l1-b', opened(T1))).resolves.toBeUndefined();

    const seen = await tab2.load();
    expect(seen.lessons['l1-a']).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T2,
    });
    expect(seen.lessons['l1-b']).toEqual(opened(T1));

    // Storage recovers: the next save writes the join, so nothing held is lost.
    quota.mockRestore();
    await tab2.saveLab('lab-a', { status: 'started' });
    const after = await stored();
    expect(after.lessons['l1-a']).toEqual({
      status: 'completed',
      lastOpenedAt: T3,
      completedAt: T2,
    });
    expect(after.lessons['l1-b']).toEqual(opened(T1));
    expect(after.labs['lab-a']).toEqual({ status: 'started' });
  });

  it('keeps a stale in-memory record from undoing a completion that arrived in storage later', async () => {
    const tab1 = createLocalStore();
    const tab2 = createLocalStore();
    const quota = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    await tab2.saveLesson('l1-a', opened(T1)); // held in memory only
    quota.mockRestore();
    await tab1.saveLesson('l1-a', done(T2)); // completed in tab 1, written
    await tab2.saveLesson('l1-b', opened(T3)); // tab 2 writes again

    expect((await stored()).lessons['l1-a']?.status).toBe('completed');
  });
});
