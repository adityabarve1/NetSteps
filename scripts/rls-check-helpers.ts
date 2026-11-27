// Plumbing for rls-check.ts: environment, PASS/FAIL reporting, test users, cleanup.
// Everything here uses the public anon key only.
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/** The client type createClient returns (not spelled out, so no `any` leaks in). */
export type Db = ReturnType<typeof makeClient>;
export type Row = Record<string, unknown>;
/** null means the check passed; a string says what went wrong. */
export type Problem = string | null;
/** The part of a Supabase response these checks look at. */
export interface Res {
  data: unknown;
  error: { message: string } | null;
}

export interface Env {
  url: string;
  anonKey: string;
  /** An address the owner controls; test users are plus-addressed variants of it. */
  testEmail: { local: string; domain: string };
}

export interface TestUser {
  label: string;
  email: string;
  password: string;
  id: string;
  db: Db;
  /** Set once delete_my_account has succeeded, so cleanup does not repeat it. */
  deleted: boolean;
}

/** A problem with the setup that the owner can fix; printed without a stack trace. */
export class SetupError extends Error {}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function jwtRole(key: string): string | undefined {
  const payload = key.split('.')[1];
  if (payload === undefined) {
    return undefined;
  }
  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (
      typeof claims === 'object' &&
      claims !== null &&
      'role' in claims &&
      typeof claims.role === 'string'
    ) {
      return claims.role;
    }
  } catch {
    // Not a JWT (for example a publishable key): nothing to inspect.
  }
  return undefined;
}

export function loadEnv(): Env {
  try {
    process.loadEnvFile(resolve(import.meta.dirname, '..', '.env.local'));
  } catch {
    // No .env.local: fall back to variables already set in the shell.
  }
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new SetupError(
      'Cannot run the RLS check: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set.\n' +
        'Copy .env.example to .env.local and fill in the project URL and the anon (public) key\n' +
        'from the Supabase dashboard (Project Settings > API), then run pnpm rls:check again.',
    );
  }
  try {
    new URL(url);
  } catch {
    throw new SetupError(`VITE_SUPABASE_URL is not a valid URL: ${url}`);
  }
  // This script must never run with a privileged key, because that would bypass RLS
  // and make every check meaningless.
  const role = jwtRole(anonKey);
  if (
    anonKey.startsWith('sb_secret_') ||
    (role !== undefined && role !== 'anon')
  ) {
    throw new SetupError(
      'VITE_SUPABASE_ANON_KEY holds a privileged key, not the public anon key. Refusing to run.\n' +
        'Put the anon (public) key there, and rotate the key you pasted if it was ever shared.',
    );
  }
  // Supabase rejects made-up domains such as example.com, and with "Confirm email" on
  // it would mail whatever address it is given. So test users are plus-addressed
  // variants of a mailbox the owner controls (you+netsteps-rls-a-1f2e3d@gmail.com).
  const email = process.env.RLS_CHECK_EMAIL?.trim() ?? '';
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) {
    throw new SetupError(
      'Cannot run the RLS check: RLS_CHECK_EMAIL is not set.\n' +
        'Add a line like RLS_CHECK_EMAIL=you@gmail.com to .env.local, using an address you own.\n' +
        'The script signs up two throwaway users such as you+netsteps-rls-a-1f2e3d@gmail.com\n' +
        '(Supabase rejects fake domains like example.com). Nothing is emailed while "Confirm email" is off.',
    );
  }
  return {
    url,
    anonKey,
    testEmail: { local: email.slice(0, at), domain: email.slice(at + 1) },
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

export function totals(): { passed: number; failed: number } {
  return { passed, failed };
}

/** Run one check, print a PASS or FAIL line, and never let it throw. */
export async function check(
  name: string,
  run: () => Promise<Problem>,
): Promise<void> {
  let problem: Problem;
  try {
    problem = await run();
  } catch (error) {
    problem = `unexpected error: ${describeError(error)}`;
  }
  if (problem === null) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}\n        ${problem}`);
  }
}

/** Count and print a failure that is not one of the numbered checks. */
export function recordFailure(message: string): void {
  failed += 1;
  console.log(`FAIL  ${message}`);
}

// ---------------------------------------------------------------------------
// Reading responses
// ---------------------------------------------------------------------------

export function rowsOf(data: unknown): Row[] {
  return Array.isArray(data)
    ? data.filter(
        (item): item is Row => typeof item === 'object' && item !== null,
      )
    : [];
}

/** Passes when the request errored (it was refused). */
export function rejected(res: Res, what: string): Problem {
  return res.error ? null : `${what} was accepted, but it must be refused`;
}

/** Passes when the request errored or returned no rows (nothing leaked or changed). */
export function hidden(res: Res, what: string): Problem {
  if (res.error) {
    return null;
  }
  const count = rowsOf(res.data).length;
  return count === 0 ? null : `${what} reached ${String(count)} row(s)`;
}

export function firstError(...results: Res[]): Problem {
  return results.find((res) => res.error !== null)?.error?.message ?? null;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** One isolated client per user: no stored session, so users never mix. */
export function makeClient(env: Env) {
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function signUpTestUser(
  env: Env,
  label: string,
): Promise<TestUser> {
  const db = makeClient(env);
  const { local, domain } = env.testEmail;
  const email = `${local}+netsteps-rls-${label}-${randomBytes(6).toString('hex')}@${domain}`;
  const password = randomBytes(18).toString('base64url');
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) {
    throw new SetupError(
      `Could not sign up the test user ${email}: ${error.message}\n` +
        'RLS_CHECK_EMAIL must be an address Supabase accepts (a real domain you own a mailbox on).',
    );
  }
  if (!data.session || !data.user) {
    throw new SetupError(
      `Sign-up returned no session, so this script (anon key only) cannot continue.\n` +
        'Turn OFF "Confirm email" in Supabase (Authentication > Sign In / Providers > Email) while the check runs,\n' +
        `then turn it back on. The unconfirmed test user ${email} could not be removed automatically:\n` +
        'delete it under Authentication > Users.',
    );
  }
  return { label, email, password, id: data.user.id, db, deleted: false };
}

/** Remove every test user through delete_my_account, even after failed checks. */
export async function cleanUp(users: TestUser[]): Promise<void> {
  for (const user of users) {
    if (user.deleted) {
      continue;
    }
    await check(
      `cleanup: user ${user.label} removed with delete_my_account`,
      async () => {
        const { error } = await user.db.rpc('delete_my_account');
        if (error) {
          return `${error.message}. Remove ${user.email} under Authentication > Users.`;
        }
        user.deleted = true;
        return null;
      },
    );
  }
}
