import type { User } from '@supabase/supabase-js';
import type { AppUser } from '@/auth/useAuth';

// The same keys, in the same order, that the database trigger uses to fill in
// profiles.display_name, so the name on screen matches the saved one.
const NAME_KEYS = ['display_name', 'full_name', 'name'] as const;

function pickDisplayName(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  for (const key of NAME_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
}

/** The small, stable shape the rest of the app sees instead of Supabase's User. */
export function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: pickDisplayName(user.user_metadata),
  };
}

export function sameUser(a: AppUser | null, b: AppUser | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.id === b.id && a.email === b.email && a.displayName === b.displayName
  );
}
