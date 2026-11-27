import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { emptyProgress } from '@/progress/logic';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  withQuiz,
} from '@/test/progressFixtures';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const stored = () => window.localStorage.getItem(GUEST_STORAGE_KEY);

describe('round trip', () => {
  it('uses the documented default key', () => {
    expect(GUEST_STORAGE_KEY).toBe('netsteps.progress.guest.v1');
  });

  it('starts empty', async () => {
    expect(await createLocalStore().load()).toEqual(emptyProgress());
  });

  it('saves a lesson and a lab under the default key as { v: 1, state }', async () => {
    const store = createLocalStore();
    await store.saveLesson('l1-a', withQuiz(done(T1), 4, 5));
    await store.saveLab('lab-a', { status: 'completed', completedAt: T2 });

    expect(JSON.parse(stored() ?? 'null')).toEqual({
      v: 1,
      state: {
        lessons: { 'l1-a': withQuiz(done(T1), 4, 5) },
        labs: { 'lab-a': { status: 'completed', completedAt: T2 } },
      },
    });
    expect(await createLocalStore().load()).toEqual({
      lessons: { 'l1-a': withQuiz(done(T1), 4, 5) },
      labs: { 'lab-a': { status: 'completed', completedAt: T2 } },
    });
  });

  it('keeps every write when saves are started without waiting for each other', async () => {
    const store = createLocalStore();
    await Promise.all([
      store.saveLesson('l1-a', opened(T1)),
      store.saveLesson('l1-b', opened(T2)),
      store.saveLab('lab-a', { status: 'started' }),
    ]);
    const state = await store.load();
    expect(Object.keys(state.lessons).sort()).toEqual(['l1-a', 'l1-b']);
    expect(Object.keys(state.labs)).toEqual(['lab-a']);
  });

  it('recordQuizAttempt writes nothing: the best score lives in the lesson record', async () => {
    const store = createLocalStore();
    await store.recordQuizAttempt('l1-a', 3, 5, T1);
    expect(stored()).toBeNull();
  });

  it('saveAll joins the state with what is stored (see localStore.tabs.test.ts for why)', async () => {
    const store = createLocalStore();
    await store.saveLesson('l1-old', opened(T1));
    await store.saveAll(stateOf({ 'l1-new': done(T2) }));
    expect(Object.keys((await store.load()).lessons).sort()).toEqual([
      'l1-new',
      'l1-old',
    ]);
  });

  it('keeps separate keys apart', async () => {
    await createLocalStore('other').saveLesson('l1-a', opened(T1));
    expect(await createLocalStore().load()).toEqual(emptyProgress());
  });

  it('stores a hostile id as an ordinary entry without touching prototypes', async () => {
    const store = createLocalStore();
    await store.saveLesson('__proto__', opened(T1));
    const state = await createLocalStore().load();
    expect(Object.keys(state.lessons)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>).status).toBeUndefined();
  });

  it('clear removes the key and forgets anything held in memory', async () => {
    const store = createLocalStore();
    await store.saveLesson('l1-a', opened(T1));
    store.clear();
    expect(stored()).toBeNull();
    expect(await store.load()).toEqual(emptyProgress());
  });
});

describe('RF2: corrupt or unreadable storage never throws', () => {
  it.each([
    ['corrupt JSON', '{not json'],
    ['an empty string', ''],
    ['a JSON string', '"hello"'],
    ['a JSON array', '[1,2,3]'],
    ['null', 'null'],
    ['no version', JSON.stringify({ state: { lessons: {}, labs: {} } })],
    [
      'an unknown version',
      JSON.stringify({ v: 2, state: { lessons: { x: opened(T1) }, labs: {} } }),
    ],
    [
      'a version stored as text',
      JSON.stringify({
        v: '1',
        state: { lessons: { x: opened(T1) }, labs: {} },
      }),
    ],
    ['a missing state', JSON.stringify({ v: 1 })],
    ['a state of the wrong type', JSON.stringify({ v: 1, state: 'oops' })],
  ])('loads empty for %s', async (_name, raw) => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, raw);
    await expect(createLocalStore().load()).resolves.toEqual(emptyProgress());
  });

  it('keeps the good records of a partly damaged state', async () => {
    window.localStorage.setItem(
      GUEST_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        state: {
          lessons: { good: opened(T1), bad: { status: 'nonsense' } },
          labs: 'broken',
        },
      }),
    );
    expect(await createLocalStore().load()).toEqual({
      lessons: { good: opened(T1) },
      labs: {},
    });
  });

  it('load never writes back: a damaged blob stays exactly as it was', async () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, '{not json');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');

    await createLocalStore().load();
    await createLocalStore().load();

    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(stored()).toBe('{not json');
  });

  it('load never rewrites a readable blob either', async () => {
    const raw = JSON.stringify({
      v: 1,
      state: { lessons: { a: opened(T1), junk: 1 }, labs: {} },
    });
    window.localStorage.setItem(GUEST_STORAGE_KEY, raw);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await createLocalStore().load();
    expect(setItem).not.toHaveBeenCalled();
    expect(stored()).toBe(raw);
  });

  it('loads empty when getItem throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    await expect(createLocalStore().load()).resolves.toEqual(emptyProgress());
  });

  it('still works when localStorage itself cannot be reached', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const store = createLocalStore();
    await expect(store.saveLesson('l1-a', opened(T1))).resolves.toBeUndefined();
    expect((await store.load()).lessons['l1-a']).toEqual(opened(T1));
  });

  it('keeps writes in memory when setItem throws (quota), and load returns them', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    const store = createLocalStore();

    await expect(store.saveLesson('l1-a', opened(T1))).resolves.toBeUndefined();
    await expect(
      store.saveLab('lab-a', { status: 'started' }),
    ).resolves.toBeUndefined();

    const state = await store.load();
    expect(state.lessons['l1-a']).toEqual(opened(T1));
    expect(state.labs['lab-a']).toEqual({ status: 'started' });
    expect(setItem).toHaveBeenCalled();
    expect(stored()).toBeNull();
  });

  it('writes to storage again once it recovers, carrying the in-memory progress', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    const store = createLocalStore();
    await store.saveLesson('l1-a', opened(T1));
    await store.saveLesson('l1-b', opened(T2));
    expect(setItem).toHaveBeenCalledTimes(2);

    const fresh = await createLocalStore().load();
    expect(Object.keys(fresh.lessons).sort()).toEqual(['l1-a', 'l1-b']);
  });
});
