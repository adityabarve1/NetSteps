import { act, renderHook, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/useAuth';
import type { AuthResult } from '@/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import { createFakeSupabase, deferred, fakeSession } from '@/test/fakeSupabase';
import { renderAuthHook, renderLoadedAuthHook } from '@/test/renderAuthHook';

// Provided-as-nothing falls back to getSupabase(); control it so a developer's
// real .env.local can never reach a test.
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn((): SupabaseClient | null => null),
  isSupabaseConfigured: vi.fn(() => false),
}));

afterEach(() => {
  vi.mocked(getSupabase).mockReset();
  vi.mocked(getSupabase).mockReturnValue(null);
});

describe('useAuth outside a provider', () => {
  it('throws a clear error', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {
      // React logs the thrown render error; keep the test output clean.
    });
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside <AuthProvider>',
    );
    quiet.mockRestore();
  });
});

describe('status', () => {
  it('moves loading, then signed-out when there is no session', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    const { result } = renderAuthHook(fake);

    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();

    pending.resolve({ data: { session: null }, error: null });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
    expect(result.current.user).toBeNull();
  });

  it('starts signed-in when a session is already stored', async () => {
    const fake = createFakeSupabase({
      session: fakeSession({
        id: 'u-7',
        email: 'grace@example.com',
        metadata: { full_name: 'Grace Hopper' },
      }),
    });
    const { result } = renderAuthHook(fake);

    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });
    expect(result.current.user).toEqual({
      id: 'u-7',
      email: 'grace@example.com',
      displayName: 'Grace Hopper',
    });
  });

  it('follows sign-in and sign-out events', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    fake.emit('SIGNED_IN', fakeSession({ id: 'u-2', email: 'a@b.co' }));
    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.id).toBe('u-2');

    fake.emit('SIGNED_OUT', null);
    expect(result.current.status).toBe('signed-out');
    expect(result.current.user).toBeNull();
  });

  it('prefers display_name, then full_name, then name, and tolerates none', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    fake.emit(
      'SIGNED_IN',
      fakeSession({
        metadata: { name: 'N', full_name: 'F', display_name: 'D' },
      }),
    );
    expect(result.current.user?.displayName).toBe('D');
    fake.emit(
      'SIGNED_IN',
      fakeSession({ metadata: { name: 'N', full_name: 'F' } }),
    );
    expect(result.current.user?.displayName).toBe('F');
    fake.emit('SIGNED_IN', fakeSession({ metadata: { name: 'N' } }));
    expect(result.current.user?.displayName).toBe('N');
    fake.emit(
      'SIGNED_IN',
      fakeSession({ metadata: { name: 42, full_name: '  ' } }),
    );
    expect(result.current.user?.displayName).toBeNull();
  });

  it('keeps the same user object when a token refresh changes nothing', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.emit('SIGNED_IN', fakeSession());
    const before = result.current.user;

    fake.emit('TOKEN_REFRESHED', fakeSession());
    expect(result.current.user).toBe(before);
  });

  it('is signed-out, not stuck loading, when reading the session fails', async () => {
    const fake = createFakeSupabase();
    fake.getSession.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderAuthHook(fake);

    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
  });

  it('does not let a late getSession answer undo a sign-in event', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    const { result } = renderAuthHook(fake);

    fake.emit('SIGNED_IN', fakeSession({ id: 'u-3' }));
    // Let the late answer arrive and be handled before looking.
    await act(async () => {
      pending.resolve({ data: { session: null }, error: null });
      await pending.promise;
    });

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.id).toBe('u-3');
  });

  it('unsubscribes when it unmounts', async () => {
    const fake = createFakeSupabase();
    const { unmount, result } = renderAuthHook(fake);
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
    expect(fake.listenerCount()).toBe(1);

    unmount();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fake.listenerCount()).toBe(0);
  });
});

describe('client injection', () => {
  it('is unconfigured when the client is provided as null', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider client={null}>{children}</AuthProvider>
      ),
    });

    expect(result.current.status).toBe('unconfigured');
    expect(result.current.user).toBeNull();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('falls back to getSupabase() when no client is provided', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(getSupabase).toHaveBeenCalled();
    expect(result.current.status).toBe('unconfigured');
  });

  it('uses the client that getSupabase() returns when none is provided', async () => {
    const fake = createFakeSupabase({ session: fakeSession() });
    vi.mocked(getSupabase).mockReturnValue(fake.client);
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });
  });

  it('answers every action with a friendly failure when unconfigured', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider client={null}>{children}</AuthProvider>
      ),
    });
    const auth = result.current;
    const notSetUp: AuthResult = {
      ok: false,
      message: "Sign-in isn't set up yet.",
    };

    await expect(auth.signIn('a@b.co', 'password1')).resolves.toEqual(notSetUp);
    await expect(auth.signUp('a@b.co', 'password1')).resolves.toEqual(notSetUp);
    await expect(auth.signInWithGoogle()).resolves.toEqual(notSetUp);
    await expect(auth.resetPassword('a@b.co')).resolves.toEqual(notSetUp);
    await expect(auth.updatePassword('password1')).resolves.toEqual(notSetUp);
    await expect(auth.deleteAccount()).resolves.toEqual(notSetUp);
    await expect(auth.signOut()).resolves.toBeUndefined();
  });
});
