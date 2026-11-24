import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { emptyProgress, mergeProgress } from '@/progress/logic';
import { loadAccountSession, loadGuestSession } from '@/progress/session';
import type { GuestClaim } from '@/progress/session';
import { createFakeAccountStore } from '@/test/fakeStores';
import { deferred } from '@/test/fakeSupabase';
import {
  done,
  opened,
  stateOf,
  T1,
  T2,
  T3,
  withQuiz,
} from '@/test/progressFixtures';

const guestData = stateOf({ 'l1-guest': done(T1), 'l1-shared': opened(T1) });
const remoteData = stateOf({ 'l1-remote': done(T2), 'l1-shared': done(T3) });
const guestKeyPresent = () =>
  window.localStorage.getItem(GUEST_STORAGE_KEY) !== null;

async function seedGuest(state = guestData) {
  const guest = createLocalStore();
  await guest.saveAll(state);
  return guest;
}

function start(
  userId: string,
  store: ReturnType<typeof createFakeAccountStore>['store'],
  guest: ReturnType<typeof createLocalStore>,
  claim: GuestClaim = { holder: null },
  isCurrent: () => boolean = () => true,
) {
  return loadAccountSession({ userId, store, guest, claim, isCurrent });
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadGuestSession', () => {
  it('returns what the guest store holds', async () => {
    const guest = await seedGuest();
    const loaded = await loadGuestSession(guest);
    expect(loaded.progress).toEqual(guestData);
    expect(loaded.complete).toBe(true);
    await expect(loaded.settled).resolves.toBeUndefined();
  });
});

describe('loadAccountSession: nothing to merge', () => {
  it('returns the remote state and writes nothing when the guest has no progress', async () => {
    const account = createFakeAccountStore({ remote: remoteData });
    const guest = createLocalStore();

    const loaded = await start('u1', account.store, guest);

    expect(loaded.progress).toEqual(remoteData);
    expect(loaded.complete).toBe(true);
    expect(account.store.saveAll).not.toHaveBeenCalled();
  });
});

describe('loadAccountSession: merging guest progress into the account (RF5)', () => {
  it('merges guest and remote, saves the merge, and only then clears the guest key', async () => {
    const guest = await seedGuest();
    let keyWhileSaving: boolean | undefined;
    const account = createFakeAccountStore({
      remote: remoteData,
      saveAll: () => {
        keyWhileSaving = guestKeyPresent();
        return Promise.resolve();
      },
    });

    const loaded = await start('u1', account.store, guest);
    await loaded.settled;

    const merged = mergeProgress(guestData, remoteData);
    expect(loaded.progress).toEqual(merged);
    expect(account.store.saveAll).toHaveBeenCalledTimes(1);
    expect(account.store.saveAll).toHaveBeenCalledWith(merged);
    expect(keyWhileSaving).toBe(true);
    expect(guestKeyPresent()).toBe(false);
  });

  it('keeps the guest key for as long as the remote write has not finished', async () => {
    const guest = await seedGuest();
    const write = deferred<undefined>();
    const account = createFakeAccountStore({
      remote: remoteData,
      saveAll: () => write.promise,
    });

    const loaded = await start('u1', account.store, guest);
    await Promise.resolve();
    expect(guestKeyPresent()).toBe(true);

    write.resolve(undefined);
    await loaded.settled;
    expect(guestKeyPresent()).toBe(false);
  });

  it('shows the merged state straight away without waiting for the write', async () => {
    const guest = await seedGuest();
    const account = createFakeAccountStore({
      remote: remoteData,
      saveAll: () => new Promise<void>(() => undefined),
    });
    const loaded = await start('u1', account.store, guest);
    expect(Object.keys(loaded.progress.lessons).sort()).toEqual([
      'l1-guest',
      'l1-remote',
      'l1-shared',
    ]);
  });

  it('keeps the guest progress, recoverable, when the save fails', async () => {
    const guest = await seedGuest();
    const account = createFakeAccountStore({
      remote: remoteData,
      saveAll: () => Promise.reject(new Error('not saved and not queued')),
    });

    const loaded = await start('u1', account.store, guest);
    await expect(loaded.settled).resolves.toBeUndefined();

    expect(guestKeyPresent()).toBe(true);
    expect((await createLocalStore().load()).lessons['l1-guest']).toEqual(
      done(T1),
    );
  });

  it('merges quiz bests too, keeping the better score', async () => {
    const guest = await seedGuest(stateOf({ a: withQuiz(opened(T1), 5, 5) }));
    const account = createFakeAccountStore({
      remote: stateOf({ a: withQuiz(done(T2), 3, 5) }),
    });
    const loaded = await start('u1', account.store, guest);
    expect(loaded.progress.lessons.a?.quizBest).toEqual({ score: 5, total: 5 });
  });
});

describe('loadAccountSession: the remote read failed', () => {
  it('with no guest progress: an empty, incomplete session so the caller can retry', async () => {
    const account = createFakeAccountStore({
      load: () => Promise.reject(new Error('offline')),
    });
    const loaded = await start('u1', account.store, createLocalStore());
    expect(loaded.progress).toEqual(emptyProgress());
    expect(loaded.complete).toBe(false);
    expect(account.store.saveAll).not.toHaveBeenCalled();
  });

  it('with guest progress: queues the guest data for the account and then clears the guest key', async () => {
    const guest = await seedGuest();
    const account = createFakeAccountStore({
      load: () => Promise.reject(new Error('offline')),
    });

    const loaded = await start('u1', account.store, guest);
    await loaded.settled;

    expect(account.store.saveAll).toHaveBeenCalledWith(guestData);
    expect(loaded.progress).toEqual(guestData);
    expect(loaded.complete).toBe(false);
    expect(guestKeyPresent()).toBe(false);
  });

  it('keeps the guest key when even that save cannot be kept', async () => {
    const guest = await seedGuest();
    const account = createFakeAccountStore({
      load: () => Promise.reject(new Error('offline')),
      saveAll: () => Promise.reject(new Error('no room')),
    });
    const loaded = await start('u1', account.store, guest);
    await loaded.settled;
    expect(guestKeyPresent()).toBe(true);
  });
});

describe('loadAccountSession: which account gets the guest progress (RF5)', () => {
  it('does not start a merge for a session that is already out of date', async () => {
    const guest = await seedGuest();
    const account = createFakeAccountStore({ remote: remoteData });
    let current = true;
    const loading = start(
      'u1',
      account.store,
      guest,
      { holder: null },
      () => current,
    );
    current = false; // the user changed before the remote read came back

    const loaded = await loading;
    await loaded.settled;

    expect(account.store.saveAll).not.toHaveBeenCalled();
    expect(guestKeyPresent()).toBe(true);
  });

  it('gives the guest progress to ONE account when two sessions overlap', async () => {
    const guest = await seedGuest();
    const claim: GuestClaim = { holder: null };
    const write = deferred<undefined>();
    const first = createFakeAccountStore({
      remote: emptyProgress(),
      saveAll: () => write.promise,
    });
    const second = createFakeAccountStore({ remote: emptyProgress() });

    const one = await start('alice', first.store, guest, claim);
    const two = await start('bob', second.store, guest, claim);

    expect(first.store.saveAll).toHaveBeenCalledTimes(1);
    expect(second.store.saveAll).not.toHaveBeenCalled();
    expect(two.progress).toEqual(emptyProgress());

    write.resolve(undefined);
    await one.settled;
    expect(guestKeyPresent()).toBe(false);
    expect(claim.holder).toBeNull();
  });

  it('never merges the same guest data a second time once it was cleared', async () => {
    const guest = await seedGuest();
    const first = createFakeAccountStore({ remote: emptyProgress() });
    await (
      await start('alice', first.store, guest)
    ).settled;

    const second = createFakeAccountStore({
      remote: stateOf({ 'l1-b-only': done(T2) }),
    });
    const loaded = await start('bob', second.store, guest);

    expect(second.store.saveAll).not.toHaveBeenCalled();
    expect(Object.keys(loaded.progress.lessons)).toEqual(['l1-b-only']);
  });

  it('lets the next sign-in try again when the first merge could not be saved', async () => {
    const guest = await seedGuest();
    const claim: GuestClaim = { holder: null };
    const failing = createFakeAccountStore({
      remote: emptyProgress(),
      saveAll: () => Promise.reject(new Error('no room')),
    });
    await (
      await start('alice', failing.store, guest, claim)
    ).settled;
    expect(claim.holder).toBeNull();

    const working = createFakeAccountStore({ remote: emptyProgress() });
    await (
      await start('alice', working.store, guest, claim)
    ).settled;

    expect(working.store.saveAll).toHaveBeenCalledTimes(1);
    expect(guestKeyPresent()).toBe(false);
  });

  it('uses the guest data as it is when the merge begins, not as it was earlier', async () => {
    const guest = await seedGuest();
    const remoteRead = deferred<ReturnType<typeof stateOf>>();
    const account = createFakeAccountStore({ load: () => remoteRead.promise });
    const loading = start('alice', account.store, guest);
    // Someone else's merge finished and cleared the guest key while we waited.
    guest.clear();
    remoteRead.resolve(emptyProgress());

    const loaded = await loading;
    expect(account.store.saveAll).not.toHaveBeenCalled();
    expect(loaded.progress).toEqual(emptyProgress());
  });
});
