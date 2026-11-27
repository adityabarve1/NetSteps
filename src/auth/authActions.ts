// The calls that change who is signed in, written against a Supabase client
// that is passed in (or null when this copy of the site has none). Plain
// TypeScript with no React, so <AuthProvider> only has to manage state.
//
// Every action returns a result and never throws. Passwords are only ever
// passed straight through to Supabase: they are not stored, logged or put in a
// URL here.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthResult, SignUpResult } from '@/auth/useAuth';
import { siteConfig } from '@/config/site';

export interface AuthActions {
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
}

const NOT_SET_UP = "Sign-in isn't set up yet.";
const NO_NETWORK =
  "We couldn't reach the server. Check your internet connection and try again.";
const GENERIC = 'Something went wrong. Please try again.';

// Email links and Google sign-in come back here, so the owner only has to allow
// these two addresses in Supabase.
const callbackUrl = () => `${siteConfig.url}/auth/callback`;
const resetUrl = () => `${siteConfig.url}/reset-password`;

interface ErrorLike {
  message?: unknown;
  name?: unknown;
  status?: unknown;
}

// supabase-js reports "no network" as AuthRetryableFetchError with status 0;
// a fetch that throws outright is a TypeError.
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return /fetch|network|load failed/i.test(error.message);
  }
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { name, status } = error as ErrorLike;
  return name === 'AuthRetryableFetchError' || status === 0;
}

/** The message to show a person: Supabase's own words, or a friendly fallback. */
export function describeAuthError(error: unknown): string {
  if (isNetworkError(error)) {
    return NO_NETWORK;
  }
  if (typeof error === 'object' && error !== null) {
    const { message } = error as ErrorLike;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }
  return GENERIC;
}

const fail = (error: unknown): { ok: false; message: string } => ({
  ok: false,
  message: describeAuthError(error),
});

// A call that threw instead of returning an error is unexpected, so its raw
// message is not shown to a person: only "no network" or the generic text.
const failThrown = (error: unknown): { ok: false; message: string } => ({
  ok: false,
  message: isNetworkError(error) ? NO_NETWORK : GENERIC,
});

// A 4xx answer to a reset request (unknown address, "too soon after the last
// one") can differ between addresses that have an account and ones that do not.
// Treating those as success keeps the answer the same for everyone.
function dependsOnTheAddress(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { status } = error as ErrorLike;
  return typeof status === 'number' && status >= 400 && status < 500;
}

async function signOutLocally(client: SupabaseClient): Promise<void> {
  try {
    // "local" removes the session before any request is sent, so this works
    // with no network. Any error is ignored on purpose: the caller clears the
    // user from state whatever happens.
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // Same reason: there is nothing useful to do with a failed sign-out.
  }
}

const unconfigured: AuthActions = {
  signUp: () => Promise.resolve(fail({ message: NOT_SET_UP })),
  signIn: () => Promise.resolve(fail({ message: NOT_SET_UP })),
  signInWithGoogle: () => Promise.resolve(fail({ message: NOT_SET_UP })),
  signOut: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(fail({ message: NOT_SET_UP })),
  updatePassword: () => Promise.resolve(fail({ message: NOT_SET_UP })),
  deleteAccount: () => Promise.resolve(fail({ message: NOT_SET_UP })),
};

export function createAuthActions(client: SupabaseClient | null): AuthActions {
  if (client === null) {
    return unconfigured;
  }
  return {
    async signUp(email, password) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (error) {
          return fail(error);
        }
        // Email confirmation on: a user comes back but no session until the
        // link in the email is opened. Off: a session comes back.
        return { ok: true, needsConfirmation: data.session === null };
      } catch (error) {
        return failThrown(error);
      }
    },

    async signIn(email, password) {
      try {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        return error ? fail(error) : { ok: true };
      } catch (error) {
        return failThrown(error);
      }
    },

    async signInWithGoogle() {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: callbackUrl() },
        });
        return error ? fail(error) : { ok: true };
      } catch (error) {
        return failThrown(error);
      }
    },

    signOut: () => signOutLocally(client),

    async resetPassword(email) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: resetUrl(),
        });
        return error && !dependsOnTheAddress(error)
          ? fail(error)
          : { ok: true };
      } catch (error) {
        return failThrown(error);
      }
    },

    async updatePassword(password) {
      try {
        const { error } = await client.auth.updateUser({ password });
        return error ? fail(error) : { ok: true };
      } catch (error) {
        return failThrown(error);
      }
    },

    async deleteAccount() {
      try {
        const { error } = await client.rpc('delete_my_account');
        if (error) {
          return fail(error);
        }
      } catch (error) {
        return failThrown(error);
      }
      // The user row is gone, so the server may refuse the sign-out request.
      // That is fine: the local session is removed first either way.
      await signOutLocally(client);
      return { ok: true };
    },
  };
}
