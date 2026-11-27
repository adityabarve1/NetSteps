// The mutable bookkeeping behind <ProgressProvider>, kept out of React so the
// provider stays small. One `Runtime` lives for as long as the provider is
// mounted. "Identity" is who is looking: nobody known yet (null), a guest, or one
// account; each has a key, and every async step checks it is still the current
// one before it changes anything (the request token of RF5).
import type { AppUser, AuthStatus } from '@/auth/useAuth';
import { applyAction } from '@/progress/actions';
import type { ProgressAction, ProgressWrite } from '@/progress/actions';
import { mergeProgress } from '@/progress/logic';
import { loadAccountSession, loadGuestSession } from '@/progress/session';
import type { GuestClaim, LoadedSession } from '@/progress/session';
import type {
  AccountStore,
  LocalStore,
  ProgressStore,
  StoreFactory,
} from '@/progress/store';
import type { ProgressState } from '@/progress/types';
import { sendWrites } from '@/progress/writes';

export const GUEST_KEY = 'guest';
const ACCOUNT_PREFIX = 'account:';

/**
 * Who is looking, as a string that changes exactly when the learner does (a
 * refreshed token for the same user keeps the same key). Null while auth is
 * still loading, and when a signed-in user has nowhere to save (no client): that
 * learner must never be shown, or saved into, the guest's progress.
 */
export function identityKey(
  status: AuthStatus,
  user: AppUser | null,
  accountsAvailable: boolean,
): string | null {
  switch (status) {
    case 'loading':
      return null;
    case 'signed-out':
    case 'unconfigured':
      return GUEST_KEY;
    case 'signed-in':
      return user !== null && accountsAvailable
        ? `${ACCOUNT_PREFIX}${user.id}`
        : null;
  }
}

/** A loaded identity: the current progress, and where to save changes. */
export interface Ready {
  key: string;
  store: ProgressStore;
  progress: ProgressState;
  /** False when the account could not be read and must be loaded again. */
  complete: boolean;
}

export interface Session {
  key: string;
  /** The account store, or null for a guest. */
  store: AccountStore | null;
  loaded: Promise<LoadedSession>;
}

export interface Runtime {
  factory: StoreFactory;
  now: () => string;
  /** One guest store for the whole life of the provider, so progress that lives only in memory survives into the merge. */
  guest: LocalStore;
  /** One store per account, so two stores never replay the same queue. */
  accounts: Map<string, AccountStore>;
  claim: GuestClaim;
  /** The key of the identity this provider is showing now; null between identities. */
  latestKey: string | null;
  session: Session | null;
  ready: Ready | null;
  /** Actions taken before their identity finished loading, in order. */
  queued: ProgressAction[];
  refreshing: boolean;
}

export function createRuntime(
  factory: StoreFactory,
  now: () => string,
): Runtime {
  return {
    factory,
    now,
    guest: factory.guest(),
    accounts: new Map(),
    claim: { holder: null },
    latestKey: null,
    session: null,
    ready: null,
    queued: [],
    refreshing: false,
  };
}

const userIdOf = (key: string): string => key.slice(ACCOUNT_PREFIX.length);

/** Starts loading an identity. Called once per key: React may run an effect twice, the session is reused. */
export function beginSession(rt: Runtime, key: string): Session {
  if (key === GUEST_KEY) {
    return { key, store: null, loaded: loadGuestSession(rt.guest) };
  }
  const userId = userIdOf(key);
  let store = rt.accounts.get(userId);
  if (store === undefined) {
    store = rt.factory.account(userId);
    rt.accounts.set(userId, store);
  }
  return {
    key,
    store,
    loaded: loadAccountSession({
      userId,
      store,
      guest: rt.guest,
      claim: rt.claim,
      isCurrent: () => rt.latestKey === key,
    }),
  };
}

/**
 * The identity finished loading. Actions taken meanwhile are applied on top, in
 * order, and written; all in one synchronous step so none can slip in between.
 */
export function adopt(
  rt: Runtime,
  session: Session,
  loaded: LoadedSession,
): Ready {
  const store: ProgressStore = session.store ?? rt.guest;
  let progress = loaded.progress;
  const writes: ProgressWrite[] = [];
  for (const action of rt.queued.splice(0)) {
    const result = applyAction(progress, action);
    progress = result.next;
    writes.push(...result.writes);
  }
  const ready: Ready = {
    key: session.key,
    store,
    progress,
    complete: loaded.complete,
  };
  rt.ready = ready;
  sendWrites(store, writes);
  // Anything left from an earlier session (or the merge just queued) goes now.
  session.store?.flush().catch(() => undefined);
  return ready;
}

/** The identity is gone (another learner, sign-out, unmount). */
export function release(rt: Runtime, key: string): void {
  rt.latestKey = null;
  if (rt.ready?.key === key) rt.ready = null;
  // These were taken for an identity that is no longer here: never replay them
  // into whoever comes next.
  rt.queued = [];
}

/**
 * The account could not be read before. Read it again and fold the answer into
 * what is on screen (merging only ever adds, so nothing the learner did is lost).
 */
export function refresh(
  rt: Runtime,
  key: string,
  publish: (ready: Ready) => void,
): void {
  const store = rt.session?.key === key ? rt.session.store : null;
  if (store === null || rt.refreshing) return;
  rt.refreshing = true;
  void loadAccountSession({
    userId: userIdOf(key),
    store,
    guest: rt.guest,
    claim: rt.claim,
    isCurrent: () => rt.latestKey === key,
  })
    .then((loaded) => {
      const ready = rt.ready;
      if (ready?.key !== key || rt.latestKey !== key) return;
      ready.progress = mergeProgress(ready.progress, loaded.progress);
      ready.complete = loaded.complete;
      publish(ready);
    })
    .finally(() => {
      rt.refreshing = false;
    });
}
