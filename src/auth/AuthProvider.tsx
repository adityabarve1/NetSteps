import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { sameUser, toAppUser } from '@/auth/appUser';
import { createAuthActions } from '@/auth/authActions';
import { AuthContext } from '@/auth/useAuth';
import type { AppUser, AuthContextValue, AuthStatus } from '@/auth/useAuth';
import { getSupabase } from '@/lib/supabase';

interface AuthState {
  /** False until the stored session has been read once. */
  loaded: boolean;
  user: AppUser | null;
}

const NOT_LOADED: AuthState = { loaded: false, user: null };

// A password-reset email link opens the site with "#...&type=recovery" in the
// address. The library turns it into a session and then clears the address, so
// read it once, before that happens. It also fires PASSWORD_RECOVERY, but that
// can arrive before this provider has subscribed, so it is not relied on alone.
function addressIsRecoveryLink(): boolean {
  try {
    const fragment = window.location.hash.replace(/^#/, '');
    return new URLSearchParams(fragment).get('type') === 'recovery';
  } catch {
    return false;
  }
}

function deriveStatus(
  supabase: SupabaseClient | null,
  state: AuthState,
): AuthStatus {
  if (supabase === null) {
    return 'unconfigured';
  }
  if (!state.loaded) {
    return 'loading';
  }
  return state.user ? 'signed-in' : 'signed-out';
}

interface AuthProviderProps {
  children: ReactNode;
  /**
   * For tests. Left out, the app's real client is used. Passed as `null`, the
   * app behaves as if no Supabase project is configured (guest-only mode).
   */
  client?: SupabaseClient | null;
}

export function AuthProvider({ children, client }: AuthProviderProps) {
  const [passwordRecovery, setPasswordRecovery] = useState(
    addressIsRecoveryLink,
  );
  const [state, setState] = useState<AuthState>(NOT_LOADED);
  // `undefined` means "not provided", which is not the same as `null`.
  const supabase = client === undefined ? getSupabase() : client;

  // Keep the signed-in user in step with the Supabase client. State is only
  // set from callbacks (the stored session being read, an auth event), never
  // synchronously in the effect body.
  useEffect(() => {
    if (supabase === null) {
      return undefined;
    }
    let active = true;

    const adopt = (session: Session | null) => {
      const user = toAppUser(session?.user);
      setState((previous) =>
        previous.loaded && sameUser(previous.user, user)
          ? previous
          : { loaded: true, user },
      );
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }
      adopt(session);
    });

    // Reading the stored session is only the first answer: if an auth event got
    // there first, that newer answer wins.
    const firstAnswer = (session: Session | null) => {
      if (active) {
        setState((previous) =>
          previous.loaded
            ? previous
            : { loaded: true, user: toAppUser(session?.user) },
        );
      }
    };
    // The promise is handled by both callbacks below; `void` only marks that.
    void supabase.auth.getSession().then(
      ({ data: { session } }) => {
        firstAnswer(session);
      },
      () => {
        // No readable session (storage blocked, offline): treat as signed out.
        // A later auth event can still sign the visitor in.
        firstAnswer(null);
      },
    );

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const actions = useMemo(() => createAuthActions(supabase), [supabase]);

  const signOut = useCallback(async () => {
    await actions.signOut();
    // Whatever the server said, this device is signed out now.
    setState({ loaded: true, user: null });
    setPasswordRecovery(false);
  }, [actions]);

  const updatePassword = useCallback(
    async (password: string) => {
      const result = await actions.updatePassword(password);
      if (result.ok) {
        setPasswordRecovery(false);
      }
      return result;
    },
    [actions],
  );

  const deleteAccount = useCallback(async () => {
    const result = await actions.deleteAccount();
    if (result.ok) {
      setState({ loaded: true, user: null });
      setPasswordRecovery(false);
    }
    return result;
  }, [actions]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: deriveStatus(supabase, state),
      user: state.user,
      passwordRecovery,
      signUp: actions.signUp,
      signIn: actions.signIn,
      signInWithGoogle: actions.signInWithGoogle,
      signOut,
      resetPassword: actions.resetPassword,
      updatePassword,
      deleteAccount,
    }),
    [
      supabase,
      state,
      passwordRecovery,
      actions,
      signOut,
      updatePassword,
      deleteAccount,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
