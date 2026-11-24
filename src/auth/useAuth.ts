import { createContext, useContext } from 'react';

export type AuthStatus =
  'loading' | 'signed-out' | 'signed-in' | 'unconfigured';

export type AppUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AuthResult = { ok: true } | { ok: false; message: string };

/** Sign-up succeeds in two ways, and the page needs to tell them apart. */
export type SignUpResult =
  { ok: true; needsConfirmation: boolean } | { ok: false; message: string };

export interface AuthContextValue {
  /**
   * `loading` until the stored session has been read, `unconfigured` when this
   * copy of the site has no Supabase project (guest-only mode).
   */
  status: AuthStatus;
  user: AppUser | null;
  /**
   * True while the visitor holds a session that came from a password-reset
   * link. The reset page shows its form only then.
   */
  passwordRecovery: boolean;
  /**
   * With email confirmation on, `needsConfirmation` is true and there is no
   * session yet. With it off the visitor is signed in straight away.
   */
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Leaves the site for Google, then returns to /auth/callback. */
  signInWithGoogle: () => Promise<AuthResult>;
  /** Signs out of this device only, and works with no network. Never throws. */
  signOut: () => Promise<void>;
  /**
   * Succeeds for any address, known or not, so the answer never reveals which
   * addresses have accounts. Only failures that do not depend on the address
   * (no network, a server fault) come back as errors.
   */
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  /** Deletes the signed-in account and signs out of this device. */
  deleteAccount: () => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
