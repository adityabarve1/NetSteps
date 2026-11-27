// The one place the browser talks to Supabase. The app only ever holds the public
// anon key; row-level security in the database decides what that key can touch.
// When the URL or key is missing the app runs in guest-only mode (getSupabase()
// returns null), so callers must handle null.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

// Read lazily (not at import time) so tests can change the environment between calls.
function readConfig(): SupabaseConfig | null {
  const env: Record<string, string | undefined> = import.meta.env;
  const url = trimmedOrUndefined(env.VITE_SUPABASE_URL);
  const anonKey = trimmedOrUndefined(env.VITE_SUPABASE_ANON_KEY);
  // A typo in the URL must not crash the whole app, so it counts as "not configured".
  if (url === undefined || anonKey === undefined || !isHttpUrl(url)) {
    return null;
  }
  return { url, anonKey };
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return readConfig() !== null;
}

export function getSupabase(): SupabaseClient | null {
  if (client) {
    return client;
  }
  const config = readConfig();
  if (!config) {
    return null;
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Needed so email-confirmation, password-reset and Google sign-in links
      // are turned into a session when the app loads.
      detectSessionInUrl: true,
    },
  });
  return client;
}
