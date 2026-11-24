import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from '@/progress/localStore';
import { emptyProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { createFakeAccountStore } from '@/test/fakeStores';
import type { FakeAccount } from '@/test/fakeStores';
import { deferred } from '@/test/fakeSupabase';
import { done, stateOf, T1, T2 } from '@/test/progressFixtures';
import {
  authLoading,
  authSignedIn,
  renderProgress,
} from '@/test/renderProgress';

const ids = (state: ProgressState) => Object.keys(state.lessons).sort();
const ready = (result: { current: { ready: boolean } }) =>
  waitFor(() => {
    expect(result.current.ready).toBe(true);
  });
const accounts = (byUser: Record<string, FakeAccount>) => (userId: string) =>
  byUser[userId] ?? createFakeAccountStore();

beforeEach(() => {
  window.localStorage.clear();
});

describe('account A to account B with no sign-out in between (RF5)', () => {
  it('a slow load for A can never overwrite B', async () => {
    const slow = deferred<ProgressState>();
    const alice = createFakeAccountStore({ load: () => slow.promise });
    const bob = createFakeAccountStore({
      remote: stateOf({ 'l1-bob': done(T2) }),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice, bob }),
    });
    expect(view.result.current.ready).toBe(false);

    view.setAuth(authSignedIn('bob'));
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-bob']);

    await act(async () => {
      slow.resolve(stateOf({ 'l1-alice': done(T1) }));
      await slow.promise;
    });

    expect(ids(view.result.current.state)).toEqual(['l1-bob']);
    expect(view.result.current.ready).toBe(true);
    expect(alice.store.flush).not.toHaveBeenCalled();
  });

  it('treats an A to B switch as a full reset when A was already showing', async () => {
    const alice = createFakeAccountStore({
      remote: stateOf({ 'l1-alice': done(T1) }),
    });
    const slowBob = deferred<ProgressState>();
    const bob = createFakeAccountStore({ load: () => slowBob.promise });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice, bob }),
    });
    await ready(view.result);

    view.setAuth(authSignedIn('bob'));
    expect(view.result.current.state).toEqual(emptyProgress());
    expect(view.result.current.ready).toBe(false);

    await act(async () => {
      slowBob.resolve(stateOf({ 'l1-bob': done(T2) }));
      await slowBob.promise;
    });
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-bob']);
  });

  it('never merges guest progress into A when A was replaced before its load finished; B gets it', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const slow = deferred<ProgressState>();
    const alice = createFakeAccountStore({ load: () => slow.promise });
    const bob = createFakeAccountStore();
    const view = renderProgress(authLoading, {
      account: accounts({ alice, bob }),
    });
    view.setAuth(authSignedIn('alice'));
    view.setAuth(authSignedIn('bob'));
    await ready(view.result);

    await act(async () => {
      slow.resolve(emptyProgress());
      await slow.promise;
    });

    expect(alice.store.saveAll).not.toHaveBeenCalled();
    expect(bob.store.saveAll).toHaveBeenCalledTimes(1);
    expect(ids(view.result.current.state)).toEqual(['l1-guest']);
  });

  it('does not carry an action made while A was loading over to B', async () => {
    const slow = deferred<ProgressState>();
    const alice = createFakeAccountStore({ load: () => slow.promise });
    const bob = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice, bob }),
    });
    act(() => {
      view.result.current.completeLesson('l1-alices-click');
    });

    view.setAuth(authSignedIn('bob'));
    await ready(view.result);

    expect(view.result.current.state).toEqual(emptyProgress());
    expect(bob.store.saveLesson).not.toHaveBeenCalled();
    expect(alice.store.saveLesson).not.toHaveBeenCalled();
  });

  it('keeps an action made while auth was still loading for whoever signs in', async () => {
    const bob = createFakeAccountStore();
    const view = renderProgress(authLoading, { account: accounts({ bob }) });
    act(() => {
      view.result.current.openLesson('l1-early');
    });
    view.setAuth(authSignedIn('bob'));
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-early']);
    expect(bob.store.saveLesson).toHaveBeenCalledTimes(1);
  });

  // The reconnect read (`refresh`) is not tied to an effect, so its own guard is
  // the only thing stopping a slow answer for A from being merged into B.
  it('a reconnect read for A that finishes after the switch to B is never merged into B', async () => {
    let reachable = false;
    const held = deferred<ProgressState>();
    const alice = createFakeAccountStore({
      load: () =>
        reachable ? held.promise : Promise.reject(new Error('offline')),
    });
    const bob = createFakeAccountStore({
      remote: stateOf({ 'l1-bob': done(T2) }),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice, bob }),
    });
    await ready(view.result); // A could not be read: shown as incomplete
    expect(view.result.current.syncError).toBe(true);

    reachable = true;
    view.online(); // the reconnect read for A starts, and is held
    expect(alice.store.load).toHaveBeenCalledTimes(2);

    view.setAuth(authSignedIn('bob'));
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-bob']);

    await act(async () => {
      held.resolve(stateOf({ 'l1-alice': done(T1) }));
      await held.promise;
    });

    expect(ids(view.result.current.state)).toEqual(['l1-bob']);
    expect(view.result.current.ready).toBe(true);
    expect(view.result.current.syncError).toBe(false);
  });

  it('a second reconnect while the first read is still running does not start another', async () => {
    let reachable = false;
    const held = deferred<ProgressState>();
    const alice = createFakeAccountStore({
      load: () =>
        reachable ? held.promise : Promise.reject(new Error('offline')),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    reachable = true;
    view.online();
    view.online();
    expect(alice.store.load).toHaveBeenCalledTimes(2); // the first, and one retry
    await act(async () => {
      held.resolve(stateOf({ 'l1-alice': done(T1) }));
      await held.promise;
    });
    expect(ids(view.result.current.state)).toEqual(['l1-alice']);
    expect(view.result.current.syncError).toBe(false);
  });
});
