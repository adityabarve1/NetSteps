// Loading progress when the learner's identity becomes known, including the one
// moment that can lose or leak progress: guest progress moving into an account
// (RF5). Plain TypeScript with no React, so the ordering rules can be tested alone.
//
// The rules, in order:
//   1. Read the account. If that fails the session is shown as incomplete (so the
//      caller can try again) instead of pretending the account is empty.
//   2. Only a session that is still wanted may take the guest's progress, and only
//      one session at a time (`claim`), so two accounts can never both receive it.
//   3. Merge guest and account, show it at once, and in the background save the
//      merge. The guest copy is deleted ONLY after that save either succeeded or
//      was safely kept in the queue. If it was neither, the guest copy stays.
import { emptyProgress, mergeProgress } from '@/progress/logic';
import type { AccountStore, LocalStore } from '@/progress/store';
import type { ProgressState } from '@/progress/types';

export interface GuestClaim {
  /** The account currently merging the guest's progress, or null. */
  holder: string | null;
}

export interface LoadedSession {
  progress: ProgressState;
  /** False when the account could not be read: the caller should load again later. */
  complete: boolean;
  /** Settles (never rejects) when the background save of a merge has finished. */
  settled: Promise<void>;
}

const isEmpty = (state: ProgressState): boolean =>
  Object.keys(state.lessons).length === 0 &&
  Object.keys(state.labs).length === 0;

export async function loadGuestSession(
  guest: LocalStore,
): Promise<LoadedSession> {
  return {
    progress: await guest.load(),
    complete: true,
    settled: Promise.resolve(),
  };
}

interface AccountSessionInput {
  userId: string;
  store: AccountStore;
  guest: LocalStore;
  claim: GuestClaim;
  /** False once the learner has moved on (another user, signed out, unmounted). */
  isCurrent: () => boolean;
}

export async function loadAccountSession({
  userId,
  store,
  guest,
  claim,
  isCurrent,
}: AccountSessionInput): Promise<LoadedSession> {
  let remote: ProgressState | null;
  try {
    remote = await store.load();
  } catch {
    remote = null;
  }
  const account = remote ?? emptyProgress();
  const complete = remote !== null;
  const withoutMerge: LoadedSession = {
    progress: account,
    complete,
    settled: Promise.resolve(),
  };

  // No await between this check and taking the claim: either this session takes
  // the guest's progress or it does not, never both it and another one.
  if (!isCurrent() || claim.holder !== null) return withoutMerge;
  claim.holder = userId;

  // Read the guest only now, so progress another session already took and
  // cleared is not merged a second time.
  const guestState = await guest.load();
  if (isEmpty(guestState)) {
    claim.holder = null;
    return withoutMerge;
  }

  const merged = mergeProgress(guestState, account);
  const settled = (async () => {
    try {
      await store.saveAll(merged);
      guest.clear();
    } catch {
      // Neither saved nor kept: the guest copy stays, and the next sign-in
      // merges it again (saving a merge twice never duplicates anything).
    } finally {
      claim.holder = null;
    }
  })();
  return { progress: merged, complete, settled };
}
