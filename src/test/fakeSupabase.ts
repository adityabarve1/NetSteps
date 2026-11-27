// A stand-in for the Supabase client, injected into <AuthProvider client={...}>.
// Tests must never reach a real project, so nothing here touches the network.
// It behaves like the real client in the ways the app relies on: sign-in,
// sign-up (with email confirmation on), sign-out and password updates emit the
// same auth events a real client would.
import { act } from '@testing-library/react';
import type {
  AuthChangeEvent,
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { vi } from 'vitest';

export type AuthListener = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

interface Outcome {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
}

interface FakeSessionOptions {
  id?: string;
  email?: string | null;
  metadata?: Record<string, unknown>;
}

export function fakeAuthError(
  message: string,
  status = 400,
  name = 'AuthApiError',
): AuthError {
  const error = new Error(message);
  error.name = name;
  return Object.assign(error, { status }) as unknown as AuthError;
}

export function fakeSession({
  id = 'user-1',
  email = 'ada@example.com',
  metadata = {},
}: FakeSessionOptions = {}): Session {
  return {
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id,
      email: email ?? undefined,
      user_metadata: metadata,
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function createFakeSupabase(options: { session?: Session | null } = {}) {
  const listeners = new Set<AuthListener>();
  const initialSession = options.session ?? null;

  // Wrapped in act because components update state from these callbacks.
  const emit = (event: AuthChangeEvent, session: Session | null) => {
    act(() => {
      for (const listener of [...listeners]) {
        listener(event, session);
      }
    });
  };

  const getSession = vi.fn(() =>
    Promise.resolve({ data: { session: initialSession }, error: null }),
  );

  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((listener: AuthListener) => {
    listeners.add(listener);
    return {
      data: {
        subscription: {
          id: 'fake-subscription',
          callback: listener,
          unsubscribe: () => {
            unsubscribe();
            listeners.delete(listener);
          },
        },
      },
    };
  });

  const signInWithPassword = vi.fn(
    (credentials: { email: string; password: string }): Promise<Outcome> => {
      const session = fakeSession({ email: credentials.email });
      emit('SIGNED_IN', session);
      return Promise.resolve({
        data: { user: session.user, session },
        error: null,
      });
    },
  );

  // Email confirmation is ON by default: a user comes back, but no session.
  const signUp = vi.fn(
    (params: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }): Promise<Outcome> =>
      Promise.resolve({
        data: {
          user: fakeSession({ email: params.email }).user,
          session: null,
        },
        error: null,
      }),
  );

  const signInWithOAuth = vi.fn<
    (params: {
      provider: string;
      options?: { redirectTo?: string };
    }) => Promise<{ data: { url: string | null }; error: AuthError | null }>
  >(() =>
    Promise.resolve({
      data: { url: 'https://accounts.example/oauth' },
      error: null,
    }),
  );

  const signOut = vi.fn<
    (options?: { scope?: string }) => Promise<{ error: AuthError | null }>
  >(() => {
    emit('SIGNED_OUT', null);
    return Promise.resolve({ error: null });
  });

  const resetPasswordForEmail = vi.fn<
    (
      email: string,
      options?: { redirectTo?: string },
    ) => Promise<{ error: AuthError | null }>
  >(() => Promise.resolve({ error: null }));

  const updateUser = vi.fn<
    (attributes: {
      password?: string;
    }) => Promise<{ data: { user: User | null }; error: AuthError | null }>
  >(() => Promise.resolve({ data: { user: fakeSession().user }, error: null }));

  const rpc = vi.fn<
    (
      fn: string,
      args?: unknown,
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  >(() => Promise.resolve({ data: null, error: null }));

  const client = {
    auth: {
      getSession,
      onAuthStateChange,
      signInWithPassword,
      signUp,
      signInWithOAuth,
      signOut,
      resetPasswordForEmail,
      updateUser,
    },
    rpc,
  } as unknown as SupabaseClient;

  return {
    client,
    getSession,
    onAuthStateChange,
    unsubscribe,
    signInWithPassword,
    signUp,
    signInWithOAuth,
    signOut,
    resetPasswordForEmail,
    updateUser,
    rpc,
    emit,
    listenerCount: () => listeners.size,
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
