import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { emptyProgress, mergeProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { createFakeAccountStore } from '@/test/fakeStores';
import type { FakeAccount } from '@/test/fakeStores';
import { done, opened, stateOf, T1, T2, T3 } from '@/test/progressFixtures';
import {
  authSignedIn,
  authSignedOut,
  renderProgress,
} from '@/test/renderProgress';

const guestBlob = () => window.localStorage.getItem(GUEST_STORAGE_KEY);
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

describe('guest to account (RF5)', () => {
  it('merges guest progress with the remote, saves the merge, then clears the guest key', async () => {
    const guestState = stateOf({
      'l1-guest': done(T1),
      'l1-shared': opened(T1),
    });
    const remote = stateOf({ 'l1-remote': done(T2), 'l1-shared': done(T3) });
    await createLocalStore().saveAll(guestState);
    let keyDuringSave: boolean | undefined;
    const alice = createFakeAccountStore({
      remote,
      saveAll: () => {
        keyDuringSave = guestBlob() !== null;
        return Promise.resolve();
      },
    });
    const view = renderProgress(authSignedOut, {
      account: accounts({ alice }),
    });
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-guest', 'l1-shared']);

    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    const merged = mergeProgress(guestState, remote);
    expect(view.result.current.state).toEqual(merged);
    expect(alice.store.saveAll).toHaveBeenCalledTimes(1);
    expect(alice.store.saveAll).toHaveBeenCalledWith(merged);
    expect(keyDuringSave).toBe(true);
    await waitFor(() => {
      expect(guestBlob()).toBeNull();
    });
  });

  it('keeps the guest progress, recoverable, when the merge could not be saved', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const alice = createFakeAccountStore({
      saveAll: () => Promise.reject(new Error('not saved and not queued')),
    });
    const view = renderProgress(authSignedOut, {
      account: accounts({ alice }),
    });
    await ready(view.result);

    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    await act(async () => {
      await Promise.resolve();
    });

    expect(ids(view.result.current.state)).toEqual(['l1-guest']);
    expect(guestBlob()).not.toBeNull();
    expect((await createLocalStore().load()).lessons['l1-guest']).toEqual(
      done(T1),
    );
  });

  it('does not merge a second time on a repeated auth event for the same user (token refresh)', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const alice = createFakeAccountStore();
    const view = renderProgress(authSignedOut, {
      account: accounts({ alice }),
    });
    await ready(view.result);
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    view.setAuth(authSignedIn('alice'));
    view.setAuth(authSignedIn('alice'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(alice.store.saveAll).toHaveBeenCalledTimes(1);
    expect(alice.store.load).toHaveBeenCalledTimes(1);
    expect(alice.store.flush).toHaveBeenCalledTimes(1);
    expect(view.created).toHaveLength(1);
  });

  it('does not double-merge or double-flush under StrictMode', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const alice = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
      strict: true,
    });
    await ready(view.result);
    await act(async () => {
      await Promise.resolve();
    });

    expect(alice.store.load).toHaveBeenCalledTimes(1);
    expect(alice.store.saveAll).toHaveBeenCalledTimes(1);
    expect(alice.store.flush).toHaveBeenCalledTimes(1);
    expect(ids(view.result.current.state)).toEqual(['l1-guest']);
  });

  it('does not re-merge old guest data into a later sign-in once it was cleared', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const alice = createFakeAccountStore();
    const bob = createFakeAccountStore({
      remote: stateOf({ 'l1-bob': done(T2) }),
    });
    const view = renderProgress(authSignedOut, {
      account: accounts({ alice, bob }),
    });
    await ready(view.result);

    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    await waitFor(() => {
      expect(guestBlob()).toBeNull();
    });
    view.setAuth(authSignedOut);
    await ready(view.result);
    view.setAuth(authSignedIn('bob'));
    await ready(view.result);

    expect(bob.store.saveAll).not.toHaveBeenCalled();
    expect(ids(view.result.current.state)).toEqual(['l1-bob']);
  });

  it('shows the guest progress and queues it for the account when the remote cannot be read', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-guest': done(T1) }));
    const alice = createFakeAccountStore({
      load: () => Promise.reject(new Error('offline')),
    });
    const view = renderProgress(authSignedOut, {
      account: accounts({ alice }),
    });
    await ready(view.result);

    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    expect(ids(view.result.current.state)).toEqual(['l1-guest']);
    expect(alice.store.saveAll).toHaveBeenCalledWith(
      stateOf({ 'l1-guest': done(T1) }),
    );
    expect(view.result.current.syncError).toBe(true);
  });

  it('loads the remote on reconnect and merges it into what is on screen', async () => {
    let reachable = false;
    const alice = createFakeAccountStore({
      load: () =>
        reachable
          ? Promise.resolve(stateOf({ 'l1-remote': done(T2) }))
          : Promise.reject(new Error('offline')),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    expect(view.result.current.syncError).toBe(true);
    act(() => {
      view.result.current.openLesson('l1-local');
    });

    reachable = true;
    view.online();

    await waitFor(() => {
      expect(ids(view.result.current.state)).toEqual(['l1-local', 'l1-remote']);
    });
    expect(view.result.current.syncError).toBe(false);
    expect(alice.store.flush).toHaveBeenCalled();
  });
});

describe('account to guest (RF5)', () => {
  it('empties the state at once on sign-out', async () => {
    const alice = createFakeAccountStore({
      remote: stateOf({ 'l1-alice': done(T1) }),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    expect(ids(view.result.current.state)).toEqual(['l1-alice']);

    view.setAuth(authSignedOut);

    // The very render that sees the sign-out no longer shows the account.
    expect(view.result.current.state).toEqual(emptyProgress());
    expect(view.result.current.ready).toBe(false);
    await ready(view.result);
    expect(view.result.current.state).toEqual(emptyProgress());
  });

  it('never writes signed-in progress to the guest store, before or after sign-out', async () => {
    const alice = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    act(() => {
      view.result.current.openLesson('l1-alice-secret');
      view.result.current.completeLesson('l1-alice-secret');
    });
    expect(guestBlob()).toBeNull();

    view.setAuth(authSignedOut);
    await ready(view.result);

    expect(guestBlob() ?? '').not.toContain('l1-alice-secret');
    expect(Object.keys(window.localStorage).join(',')).not.toContain(
      'alice-secret',
    );
    act(() => {
      view.result.current.openLesson('l1-as-guest');
    });
    expect(guestBlob()).toContain('l1-as-guest');
    expect(guestBlob()).not.toContain('l1-alice-secret');
  });

  it('does not send an action taken after sign-out to the account that left', async () => {
    const alice = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    view.setAuth(authSignedOut);
    await ready(view.result);
    alice.store.saveLesson.mockClear();

    act(() => {
      view.result.current.openLesson('l1-after');
    });

    expect(alice.store.saveLesson).not.toHaveBeenCalled();
  });

  it("shows a different user only their own remote data, not the previous account's", async () => {
    const alice = createFakeAccountStore({
      remote: stateOf({ 'l1-alice': done(T1) }),
    });
    const bob = createFakeAccountStore({
      remote: stateOf({ 'l1-bob': done(T2) }),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice, bob }),
    });
    await ready(view.result);

    view.setAuth(authSignedOut);
    await ready(view.result);
    view.setAuth(authSignedIn('bob'));
    expect(view.result.current.state).toEqual(emptyProgress());
    await ready(view.result);

    expect(ids(view.result.current.state)).toEqual(['l1-bob']);
    expect(bob.store.saveAll).not.toHaveBeenCalled();
    act(() => {
      view.result.current.openLesson('l1-new');
    });
    expect(bob.store.saveLesson).toHaveBeenCalledTimes(1);
    expect(alice.store.saveLesson).not.toHaveBeenCalled();
  });

  it('gives a returning user a fresh read, not a stale copy from earlier in the session', async () => {
    let calls = 0;
    const alice = createFakeAccountStore({
      load: () =>
        Promise.resolve(stateOf({ [`l1-read-${String(++calls)}`]: done(T1) })),
    });
    const view = renderProgress(authSignedIn('alice'), {
      account: accounts({ alice }),
    });
    await ready(view.result);
    view.setAuth(authSignedOut);
    await ready(view.result);
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    expect(ids(view.result.current.state)).toEqual(['l1-read-2']);
    expect(view.storesFor('alice')).toHaveLength(1);
  });
});
