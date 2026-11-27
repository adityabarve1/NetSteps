import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const URL_NAME = 'VITE_SUPABASE_URL';
const KEY_NAME = 'VITE_SUPABASE_ANON_KEY';
const projectUrl = 'https://abcdefghijklmnop.supabase.co';
// Not a real key: the client only stores it until the first request.
const anonKey = 'test-anon-key';

// supabase.ts caches its client at module level, so every test loads a fresh copy.
async function loadModule() {
  vi.resetModules();
  return import('./supabase');
}

beforeEach(() => {
  // A developer's real .env.local must never leak into these tests.
  vi.stubEnv(URL_NAME, undefined);
  vi.stubEnv(KEY_NAME, undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabase without configuration (guest-only mode)', () => {
  it('returns null and reports not configured when both variables are unset', async () => {
    const { getSupabase, isSupabaseConfigured } = await loadModule();
    expect(getSupabase()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns null when only the URL is set', async () => {
    vi.stubEnv(URL_NAME, projectUrl);
    const { getSupabase, isSupabaseConfigured } = await loadModule();
    expect(getSupabase()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns null when only the anon key is set', async () => {
    vi.stubEnv(KEY_NAME, anonKey);
    const { getSupabase, isSupabaseConfigured } = await loadModule();
    expect(getSupabase()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it.each(['', '   ', '\t\n'])(
    'treats %j as missing for either variable',
    async (blank) => {
      vi.stubEnv(URL_NAME, blank);
      vi.stubEnv(KEY_NAME, anonKey);
      const first = await loadModule();
      expect(first.getSupabase()).toBeNull();

      vi.stubEnv(URL_NAME, projectUrl);
      vi.stubEnv(KEY_NAME, blank);
      const second = await loadModule();
      expect(second.getSupabase()).toBeNull();
      expect(second.isSupabaseConfigured()).toBe(false);
    },
  );

  it.each([
    'not a url',
    'supabase.co',
    'ftp://example.com',
    'javascript:alert(1)',
  ])(
    'treats the malformed or non-http URL %j as missing and never throws',
    async (badUrl) => {
      vi.stubEnv(URL_NAME, badUrl);
      vi.stubEnv(KEY_NAME, anonKey);
      const { getSupabase, isSupabaseConfigured } = await loadModule();
      expect(() => getSupabase()).not.toThrow();
      expect(getSupabase()).toBeNull();
      expect(isSupabaseConfigured()).toBe(false);
    },
  );
});

describe('getSupabase with configuration', () => {
  it('returns a client and reports configured when both variables are set', async () => {
    vi.stubEnv(URL_NAME, projectUrl);
    vi.stubEnv(KEY_NAME, anonKey);
    const { getSupabase, isSupabaseConfigured } = await loadModule();
    const client = getSupabase();
    expect(client).not.toBeNull();
    expect(typeof client?.auth.signInWithPassword).toBe('function');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('creates the client once and returns the same instance on repeat calls', async () => {
    vi.stubEnv(URL_NAME, projectUrl);
    vi.stubEnv(KEY_NAME, anonKey);
    const { getSupabase } = await loadModule();
    const first = getSupabase();
    expect(first).not.toBeNull();
    expect(getSupabase()).toBe(first);
    expect(getSupabase()).toBe(first);
  });

  it('trims surrounding whitespace from both values', async () => {
    vi.stubEnv(URL_NAME, `  ${projectUrl}\n`);
    vi.stubEnv(KEY_NAME, `\t${anonKey}  `);
    const { getSupabase, isSupabaseConfigured } = await loadModule();
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabase()).not.toBeNull();
  });
});

describe('supabase.ts source', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'supabase.ts'),
    'utf8',
  );
  // Built from parts so this file itself passes the repo-wide guard in tooling.test.ts.
  const forbidden = ['SERVICE', 'ROLE'].join('_');

  it('never mentions a privileged-key environment variable', () => {
    expect(source.toUpperCase()).not.toContain(forbidden);
  });

  it('reads only the two public Supabase variables', () => {
    const names = new Set(source.match(/VITE_[A-Z0-9_]+/g) ?? []);
    expect([...names].sort()).toEqual([KEY_NAME, URL_NAME].sort());
  });
});
