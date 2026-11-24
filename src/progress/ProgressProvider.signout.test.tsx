// RF5 and RF3 meet at sign-out. Signing out must clear the account from this
// browser, but unsent writes must not be lost. So before the local sign-out the
// progress provider gets a bounded chance to send them (AuthProvider runs a
// "before sign-out" handler, see src/auth/beforeSignOut.ts):
//   * online: everything is sent, and no key of that account is left;
//   * offline: the unsent writes stay under THAT account's own key prefix, are
//     never read by another account's store, and never reach the guest key.
import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/useAuth';
import type { AuthContextValue } from '@/auth/useAuth';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import { useProgress } from '@/progress/useProgress';
import type { ProgressContextValue } from '@/progress/useProgress';
import { createFakeDb } from '@/test/fakeDb';
import { createFakeSupabase, fakeSession } from '@/test/fakeSupabase';
import { pendingKeys } from '@/test/pendingStorage';
import {
  authSignedIn,
  authSignedOut,
  renderProgress,
} from '@/test/renderProgress';
import { createFakeAccountStore } from '@/test/fakeStores';

interface Seen {
  progress: ProgressContextValue;
  auth: AuthContextValue;
}

// The real AuthProvider (over the fake auth client), the real ProgressProvider and
// the real Supabase store (over the fake database), side by side.
function mountApp(userId = 'alice') {
  const fake = createFakeSupabase({ session: fakeSession({ id: userId }) });
  const db = createFakeDb({ userId });
  const guest = createLocalStore();
  let seen: Seen | undefined;
  function Probe() {
    const progress = useProgress();
    const auth = useAuth();
    useEffect(() => {
      seen = { progress, auth };
    });
    return null;
  }
  render(
    <AuthProvider client={fake.client}>
      <ProgressProvider
        client={null}
        storeFactory={{
          guest: () => guest,
          account: (id) => createSupabaseStore(db.client, id),
        }}
      >
        <Probe />
      </ProgressProvider>
    </AuthProvider>,
  );
  const now = (): Seen => {
    if (seen === undefined) throw new Error('not rendered yet');
    return seen;
  };
  return { fake, db, now };
}

const ready = (now: () => Seen) =>
  waitFor(() => {
    expect(now().progress.ready).toBe(true);
  });

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('sign out online', () => {
  it('sends the waiting writes first, so no key of the account is left behind', async () => {
    const { fake, db, now } = mountApp('alice');
    await ready(now);
    db.setOffline(true);
    act(() => {
      now().progress.completeLesson('l1-a');
      now().progress.startLab('lab-a');
    });
    await waitFor(() => {
      expect(now().progress.syncError).toBe(true);
    });
    expect(pendingKeys(pendingKey('alice')).length).toBeGreaterThan(0);

    db.setOffline(false); // back online, but no `online` event has fired yet
    await act(async () => {
      await now().auth.signOut();
    });

    expect(db.table('lesson_progress').map((row) => row.lesson_id)).toEqual([
      'l1-a',
    ]);
    expect(db.table('lab_progress').map((row) => row.lab_id)).toEqual([
      'lab-a',
    ]);
    expect(pendingKeys(pendingKey('alice'))).toEqual([]);
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await waitFor(() => {
      expect(now().auth.status).toBe('signed-out');
    });
    expect(now().progress.state.lessons).toEqual({});
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
  });
});

describe('sign out offline', () => {
  it('still signs out; the unsent writes stay under the account that made them', async () => {
    const { fake, db, now } = mountApp('alice');
    await ready(now);
    db.setOffline(true);
    act(() => {
      now().progress.completeLesson('l1-alices');
    });
    await waitFor(() => {
      expect(now().progress.syncError).toBe(true);
    });

    await act(async () => {
      await now().auth.signOut();
    });

    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await waitFor(() => {
      expect(now().auth.status).toBe('signed-out');
    });
    expect(now().progress.state.lessons).toEqual({});
    expect(pendingKeys(pendingKey('alice'))).toHaveLength(1);
    // Nothing of the account's is in the guest's key.
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? '').not.toContain(
      'l1-alices',
    );
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) ?? '';
      if (key === GUEST_STORAGE_KEY) continue;
      if (key.startsWith(`${pendingKey('alice')}.`)) continue;
      expect(window.localStorage.getItem(key) ?? '').not.toContain('l1-alices');
    }
  });

  it('a different user who signs in next never reads or sends those writes', async () => {
    const { fake, db, now } = mountApp('alice');
    await ready(now);
    db.setOffline(true);
    act(() => {
      now().progress.completeLesson('l1-alices');
    });
    await waitFor(() => {
      expect(now().progress.syncError).toBe(true);
    });
    await act(async () => {
      await now().auth.signOut();
    });
    await waitFor(() => {
      expect(now().auth.status).toBe('signed-out');
    });

    // The network is back, and Bob signs in on the same browser.
    db.setOffline(false);
    db.setSignedInAs('bob');
    db.calls.length = 0;
    fake.emit('SIGNED_IN', fakeSession({ id: 'bob' }));
    await ready(now);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(now().progress.state.lessons).toEqual({});
    expect(db.writes()).toHaveLength(0);
    expect(db.table('lesson_progress')).toHaveLength(0);
    expect(pendingKeys(pendingKey('alice'))).toHaveLength(1);
    expect(pendingKeys(pendingKey('bob'))).toEqual([]);
  });

  it('Alice gets her writes delivered when she signs back in', async () => {
    const { fake, db, now } = mountApp('alice');
    await ready(now);
    db.setOffline(true);
    act(() => {
      now().progress.completeLesson('l1-alices');
    });
    await act(async () => {
      await now().auth.signOut();
    });
    await waitFor(() => {
      expect(now().auth.status).toBe('signed-out');
    });

    db.setOffline(false);
    fake.emit('SIGNED_IN', fakeSession({ id: 'alice' }));
    await ready(now);

    await waitFor(() => {
      expect(db.table('lesson_progress')).toHaveLength(1);
    });
    expect(pendingKeys(pendingKey('alice'))).toEqual([]);
  });
});

describe('a final flush that hangs', () => {
  it('delays sign-out by the timeout and no more', async () => {
    const { fake, db, now } = mountApp('alice');
    await ready(now);
    db.setOffline(true);
    act(() => {
      now().progress.completeLesson('l1-a');
    });
    await waitFor(() => {
      expect(now().progress.syncError).toBe(true);
    });
    db.setOffline(false);
    const release = db.hold(); // every request now waits for ever

    vi.useFakeTimers();
    let finished = false;
    const signingOut = act(async () => {
      await now().auth.signOut();
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await signingOut;

    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(finished).toBe(true);
    // The write was never confirmed, so its key is kept for the account's return.
    expect(pendingKeys(pendingKey('alice'))).toHaveLength(1);
    release();
  });
});

describe("the provider's handler", () => {
  it("is registered for an account only, and flushes that account's store", async () => {
    const fake = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), { account: () => fake });
    await waitFor(() => {
      expect(view.result.current.ready).toBe(true);
    });
    expect(view.handlers.size).toBe(1);

    fake.store.flush.mockClear();
    await view.runBeforeSignOut();
    expect(fake.store.flush).toHaveBeenCalledTimes(1);
  });

  it('is not registered for a guest', async () => {
    const view = renderProgress(authSignedOut);
    await waitFor(() => {
      expect(view.result.current.ready).toBe(true);
    });
    expect(view.handlers.size).toBe(0);
  });

  it('is removed on sign-out, moved to the next account, and removed on unmount', async () => {
    const alice = createFakeAccountStore();
    const bob = createFakeAccountStore();
    const view = renderProgress(authSignedIn('alice'), {
      account: (id) => (id === 'alice' ? alice : bob),
    });
    await waitFor(() => {
      expect(view.result.current.ready).toBe(true);
    });
    expect(view.handlers.size).toBe(1);

    view.setAuth(authSignedOut);
    expect(view.handlers.size).toBe(0);

    view.setAuth(authSignedIn('bob'));
    expect(view.handlers.size).toBe(1);
    await waitFor(() => {
      expect(view.result.current.ready).toBe(true);
    });
    bob.store.flush.mockClear();
    alice.store.flush.mockClear();
    await view.runBeforeSignOut();
    expect(bob.store.flush).toHaveBeenCalledTimes(1);
    expect(alice.store.flush).not.toHaveBeenCalled();

    view.unmount();
    expect(view.handlers.size).toBe(0);
  });
});
