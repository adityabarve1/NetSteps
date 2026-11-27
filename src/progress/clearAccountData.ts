// Removes what this browser still holds for an account that no longer exists:
// its queued, not-yet-sent progress writes (`netsteps.pending.<userId>.<seq>`).
// Guest progress and the theme belong to the browser, not the account, so they
// stay. Plain TypeScript; storage errors are swallowed by storage.ts.
import { listKeys, removeItem } from '@/progress/storage';
import { pendingKey } from '@/progress/supabaseStore';

export function clearAccountData(userId: string): void {
  // An empty id (or one with a dot, which could reach into another account's
  // keys) is not a real account id, so it removes nothing.
  if (userId === '' || userId.includes('.')) return;
  const prefix = `${pendingKey(userId)}.`;
  for (const key of listKeys()) {
    if (key.startsWith(prefix)) removeItem(key);
  }
}
