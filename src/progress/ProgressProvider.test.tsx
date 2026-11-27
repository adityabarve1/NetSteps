import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { emptyProgress } from '@/progress/logic';
import { useProgress } from '@/progress/useProgress';
import { createFakeAccountStore } from '@/test/fakeStores';
import { deferred } from '@/test/fakeSupabase';
import { done, opened, stateOf, T1 } from '@/test/progressFixtures';
import {
  authLoading,
  authSignedIn,
  authSignedOut,
  authUnconfigured,
  renderProgress,
} from '@/test/renderProgress';

const guestBlob = () => window.localStorage.getItem(GUEST_STORAGE_KEY);
const ready = (result: { current: { ready: boolean } }) =>
  waitFor(() => {
    expect(result.current.ready).toBe(true);
  });

beforeEach(() => {
  window.localStorage.clear();
});

describe('useProgress', () => {
  it('throws a clear error outside a provider', () => {
    const quiet = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => renderHook(() => useProgress())).toThrow(
      'useProgress must be used inside <ProgressProvider>',
    );
    quiet.mockRestore();
  });
});

describe('guests', () => {
  it.each([
    ['signed-out', authSignedOut],
    ['unconfigured', authUnconfigured],
  ])('use the local store when auth is %s', async (_name, auth) => {
    await createLocalStore().saveLesson('l1-a', done(T1));
    const view = renderProgress(auth);
    await ready(view.result);
    expect(view.result.current.state.lessons['l1-a']).toEqual(done(T1));
    expect(view.created).toHaveLength(0);
    expect(view.result.current.syncError).toBe(false);
  });

  it('is not ready while auth is still loading, and the state is empty', () => {
    const view = renderProgress(authLoading);
    expect(view.result.current.ready).toBe(false);
    expect(view.result.current.state).toEqual(emptyProgress());
  });

  it('becomes ready only once auth has resolved and the load has finished', async () => {
    const view = renderProgress(authLoading);
    view.setAuth(authSignedOut);
    await ready(view.result);
  });

  it('persists every kind of action to the local store and updates state', async () => {
    const view = renderProgress(authSignedOut);
    await ready(view.result);

    act(() => {
      view.result.current.openLesson('l1-a');
      view.result.current.submitQuiz('l1-a', 4, 5);
      view.result.current.completeLesson('l1-a');
      view.result.current.startLab('lab-a');
      view.result.current.completeLab('lab-a');
    });

    const { state } = view.result.current;
    expect(state.lessons['l1-a']).toMatchObject({
      status: 'completed',
      quizBest: { score: 4, total: 5 },
    });
    expect(state.labs['lab-a']?.status).toBe('completed');
    const saved = await createLocalStore().load();
    expect(saved).toEqual(state);
  });

  it('stamps actions with the injected clock as full ISO times', async () => {
    const view = renderProgress(authSignedOut);
    await ready(view.result);
    act(() => {
      view.result.current.openLesson('l1-a');
    });
    expect(view.result.current.state.lessons['l1-a']?.lastOpenedAt).toBe(
      '2026-06-01T00:00:00.000Z',
    );
  });

  it('does not write for an invalid quiz result', async () => {
    const view = renderProgress(authSignedOut);
    await ready(view.result);
    act(() => {
      view.result.current.submitQuiz('l1-a', 9, 5);
      view.result.current.submitQuiz('l1-a', 1.5, 5);
    });
    expect(view.result.current.state).toEqual(emptyProgress());
    expect(guestBlob()).toBeNull();
  });

  it('keeps working, in memory, when storage is full (RF2)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const view = renderProgress(authSignedOut);
    await ready(view.result);
    act(() => {
      view.result.current.openLesson('l1-a');
    });
    expect(view.result.current.state.lessons['l1-a']).toBeDefined();
    expect((await view.guest.load()).lessons['l1-a']).toBeDefined();
    vi.restoreAllMocks();
  });
});

describe('actions before ready are not lost', () => {
  it('applies a guest action taken while auth was loading, on top of the loaded state', async () => {
    await createLocalStore().saveLesson('l1-old', done(T1));
    const view = renderProgress(authLoading);

    act(() => {
      view.result.current.openLesson('l1-early');
      view.result.current.startLab('lab-early');
    });
    expect(view.result.current.state).toEqual(emptyProgress());

    view.setAuth(authSignedOut);
    await ready(view.result);

    const { state } = view.result.current;
    expect(Object.keys(state.lessons).sort()).toEqual(['l1-early', 'l1-old']);
    expect(state.labs['lab-early']).toEqual({ status: 'started' });
    const saved = await createLocalStore().load();
    expect(Object.keys(saved.lessons).sort()).toEqual(['l1-early', 'l1-old']);
  });

  it('applies them in order, with the time they happened, not the time the load ended', async () => {
    const view = renderProgress(authLoading);
    act(() => {
      view.result.current.openLesson('l1-a');
      view.result.current.completeLesson('l1-a');
    });
    view.setAuth(authSignedOut);
    await ready(view.result);

    expect(view.result.current.state.lessons['l1-a']).toEqual({
      status: 'completed',
      lastOpenedAt: '2026-06-01T00:00:00.000Z',
      completedAt: '2026-06-01T00:00:01.000Z',
    });
  });

  it('applies an action taken while the account was still loading, and writes it to the account', async () => {
    const remote = deferred<ReturnType<typeof stateOf>>();
    const fake = createFakeAccountStore({ load: () => remote.promise });
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });

    act(() => {
      view.result.current.completeLesson('l1-early');
    });
    expect(view.result.current.ready).toBe(false);

    await act(async () => {
      remote.resolve(stateOf({ 'l1-remote': done(T1) }));
      await remote.promise;
    });
    await ready(view.result);

    expect(Object.keys(view.result.current.state.lessons).sort()).toEqual([
      'l1-early',
      'l1-remote',
    ]);
    expect(fake.store.saveLesson).toHaveBeenCalledTimes(1);
    expect(fake.store.saveLesson).toHaveBeenCalledWith(
      'l1-early',
      expect.objectContaining({ status: 'completed' }),
    );
  });
});

describe('signed in', () => {
  it('shows the remote state once loaded and writes only the changed record', async () => {
    const fake = createFakeAccountStore({
      remote: stateOf({ 'l1-a': done(T1) }),
    });
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    expect(view.result.current.ready).toBe(false);
    await ready(view.result);
    expect(view.result.current.state.lessons['l1-a']).toEqual(done(T1));

    act(() => {
      view.result.current.openLesson('l1-b');
    });

    expect(fake.store.saveLesson).toHaveBeenCalledTimes(1);
    expect(fake.store.saveLesson).toHaveBeenCalledWith(
      'l1-b',
      opened('2026-06-01T00:00:00.000Z'),
    );
    expect(guestBlob()).toBeNull();
  });

  it('writes one quiz attempt per submit and updates the best locally', async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);

    act(() => {
      view.result.current.openLesson('l1-a');
      view.result.current.submitQuiz('l1-a', 3, 5);
      view.result.current.submitQuiz('l1-a', 5, 5);
      view.result.current.submitQuiz('l1-a', 2, 5);
    });

    expect(fake.store.recordQuizAttempt).toHaveBeenCalledTimes(3);
    expect(fake.store.recordQuizAttempt).toHaveBeenNthCalledWith(
      1,
      'l1-a',
      3,
      5,
      expect.any(String),
    );
    expect(view.result.current.state.lessons['l1-a']?.quizBest).toEqual({
      score: 5,
      total: 5,
    });
  });

  it('writes no attempt for an invalid result', async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    act(() => {
      view.result.current.submitQuiz('l1-a', 6, 5);
    });
    expect(fake.store.recordQuizAttempt).not.toHaveBeenCalled();
    expect(fake.store.saveLesson).not.toHaveBeenCalled();
  });

  it('does not write when an action changes nothing', async () => {
    const fake = createFakeAccountStore({
      remote: stateOf({ 'l1-a': done(T1) }),
    });
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    act(() => {
      view.result.current.completeLesson('l1-a');
    });
    expect(fake.store.saveLesson).not.toHaveBeenCalled();
  });

  it('never lets a failing store call escape to the screen', async () => {
    const fake = createFakeAccountStore();
    fake.store.saveLesson.mockRejectedValue(new Error('rejected'));
    fake.store.recordQuizAttempt.mockImplementation(() => {
      throw new Error('thrown');
    });
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    act(() => {
      view.result.current.openLesson('l1-a');
      view.result.current.submitQuiz('l1-a', 3, 5);
    });
    expect(view.result.current.state.lessons['l1-a']).toBeDefined();
  });
});

describe('RF3: flushing the queue', () => {
  it('flushes once when a signed-in session is ready, and again on the online event', async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    expect(fake.store.flush).toHaveBeenCalledTimes(1);

    view.online();
    expect(fake.store.flush).toHaveBeenCalledTimes(2);
    view.online();
    expect(fake.store.flush).toHaveBeenCalledTimes(3);
  });

  it('removes the online listener when it unmounts', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: () => fake,
    });
    await ready(view.result);
    const handler = add.mock.calls.find(([type]) => type === 'online')?.[1];
    expect(handler).toBeDefined();

    view.unmount();

    expect(remove).toHaveBeenCalledWith('online', handler);
    fake.store.flush.mockClear();
    view.online();
    expect(fake.store.flush).not.toHaveBeenCalled();
  });

  it('does not flush for a guest, and ignores the online event', async () => {
    const view = renderProgress(authSignedOut);
    await ready(view.result);
    view.online();
    expect(view.created).toHaveLength(0);
  });

  it('reports syncError and droppedCount from the store as they change', async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    expect(view.result.current.syncError).toBe(false);

    act(() => {
      fake.setSyncError(true);
    });
    expect(view.result.current.syncError).toBe(true);

    act(() => {
      fake.setSyncError(false);
      fake.setDropped(2);
    });
    expect(view.result.current.syncError).toBe(false);
    expect(view.result.current.droppedCount).toBe(2);
  });

  it('stops listening to the store when it unmounts', async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await ready(view.result);
    expect(fake.listenerCount()).toBe(1);
    view.unmount();
    expect(fake.listenerCount()).toBe(0);
  });
});
