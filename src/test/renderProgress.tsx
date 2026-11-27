// Renders useProgress() inside a ProgressProvider whose auth status the test
// controls (setAuth), with fake account stores and a clock that ticks one second
// per call, so every time in a test is predictable.
import { act, render } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { vi } from 'vitest';
import { AuthContext } from '@/auth/useAuth';
import type { AppUser, AuthContextValue, AuthStatus } from '@/auth/useAuth';
import { createLocalStore } from '@/progress/localStore';
import { ProgressProvider } from '@/progress/ProgressProvider';
import type { AccountStore, LocalStore, StoreFactory } from '@/progress/store';
import { useProgress } from '@/progress/useProgress';
import type { ProgressContextValue } from '@/progress/useProgress';
import { createFakeAccountStore } from '@/test/fakeStores';
import type { FakeAccount } from '@/test/fakeStores';

export interface AuthSnapshot {
  status: AuthStatus;
  user: AppUser | null;
}

export const authLoading: AuthSnapshot = { status: 'loading', user: null };
export const authSignedOut: AuthSnapshot = { status: 'signed-out', user: null };
export const authUnconfigured: AuthSnapshot = {
  status: 'unconfigured',
  user: null,
};
// A new object on every call, as a real token refresh produces.
export const authSignedIn = (id: string): AuthSnapshot => ({
  status: 'signed-in',
  user: { id, email: `${id}@example.com`, displayName: null },
});

interface Options {
  /** Makes the fake store for a user; default is an empty remote. */
  account?: (userId: string) => FakeAccount;
  /** Use a real store (for example over the fake database) instead of a fake one. */
  realAccount?: (userId: string) => AccountStore;
  guest?: LocalStore;
  strict?: boolean;
}

export function renderProgress(initial: AuthSnapshot, options: Options = {}) {
  let auth = initial;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 5, 1, 0, 0, tick++)).toISOString();
  const created: { userId: string; fake: FakeAccount }[] = [];
  // The before-sign-out handlers, as AuthProvider keeps them. One stable function,
  // like the real one, so it does not make effects run again.
  const handlers = new Set<() => Promise<void>>();
  const registerBeforeSignOut = (handler: () => Promise<void>) => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  };
  const guest = options.guest ?? createLocalStore();
  const factory: StoreFactory = {
    guest: () => guest,
    account: (userId) => {
      if (options.realAccount) return options.realAccount(userId);
      const fake = options.account
        ? options.account(userId)
        : createFakeAccountStore();
      created.push({ userId, fake });
      return fake.store;
    },
  };

  // The latest value useProgress() returned, like renderHook's result. Kept by an
  // effect, the same way renderHook does it.
  let latest: ProgressContextValue | undefined;
  const result = {
    get current(): ProgressContextValue {
      if (latest === undefined) throw new Error('Nothing has rendered yet');
      return latest;
    },
  };
  function Probe() {
    const value = useProgress();
    useEffect(() => {
      latest = value;
    });
    return null;
  }

  // StrictMode must be the ROOT element for React to run effects twice, as it
  // does in development; inside a wrapper component it does nothing.
  function Tree() {
    const value: AuthContextValue = {
      status: auth.status,
      user: auth.user,
      passwordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      deleteAccount: vi.fn(),
      registerBeforeSignOut,
    };
    return (
      <AuthContext value={value}>
        <ProgressProvider client={null} storeFactory={factory} now={now}>
          <Probe />
        </ProgressProvider>
      </AuthContext>
    );
  }
  const element = () =>
    options.strict === true ? (
      <StrictMode>
        <Tree />
      </StrictMode>
    ) : (
      <Tree />
    );

  const view = render(element());

  return {
    result,
    unmount: view.unmount,
    /** The handlers currently registered to run before sign-out. */
    handlers,
    /** What AuthProvider.signOut does before it signs out (without the timeout). */
    runBeforeSignOut: () =>
      act(async () => {
        await Promise.allSettled([...handlers].map((handler) => handler()));
      }),
    guest,
    created,
    storesFor: (userId: string) =>
      created.filter((entry) => entry.userId === userId),
    setAuth(next: AuthSnapshot) {
      auth = next;
      view.rerender(element());
    },
    online: () => {
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
    },
  };
}
