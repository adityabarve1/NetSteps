// Proves, against a live Supabase project, that row level security and the
// database rules in supabase/migrations/0001_init.sql hold. Run it with:
//
//   pnpm rls:check
//
// It reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local and uses
// ONLY the public anon key: it signs up two throwaway users (A and B) the same way
// the app does and attacks as A. It needs "Confirm email" switched OFF in Supabase
// while it runs, because only then does sign-up return a session. Both users are
// removed at the end with delete_my_account(), even if checks fail.
// Exit code 0 means every check passed; any FAIL line gives exit code 1.
import {
  check,
  cleanUp,
  describeError,
  loadEnv,
  makeClient,
  recordFailure,
  rejected,
  rowsOf,
  SetupError,
  signUpTestUser,
  totals,
} from './rls-check-helpers.ts';
import type { Env, TestUser } from './rls-check-helpers.ts';
import {
  crossUserChecks,
  sameSnapshot,
  seed,
  snapshot,
  SPECS,
  tablesWithoutRows,
  upsertAndFunctionChecks,
} from './rls-check-isolation.ts';
import type { Snapshot } from './rls-check-isolation.ts';
import {
  labAndQuizRuleChecks,
  LESSON,
  lessonRuleChecks,
  saveLesson,
} from './rls-check-rules.ts';

async function deleteAccountChecks(
  a: TestUser,
  b: TestUser,
  env: Env,
  bBefore: Snapshot,
): Promise<void> {
  await check('before deleting, A has rows in all four tables', async () => {
    const empty = tablesWithoutRows(await snapshot(a));
    return empty.length === 0 ? null : `no rows in ${empty.join(', ')}`;
  });
  await check(
    'A can delete their own account with delete_my_account',
    async () => {
      const { error } = await a.db.rpc('delete_my_account');
      if (error) {
        return error.message;
      }
      a.deleted = true;
      return null;
    },
  );
  await check("A's rows are gone from all four tables", async () => {
    const remaining =
      SPECS.length - tablesWithoutRows(await snapshot(a)).length;
    return remaining === 0
      ? null
      : `${String(remaining)} table(s) still show A rows`;
  });
  await check('the deleted user cannot sign in again', async () =>
    rejected(
      await makeClient(env).auth.signInWithPassword({
        email: a.email,
        password: a.password,
      }),
      'a sign-in after deletion',
    ),
  );
  await check("the deleted user's old session cannot create rows", async () =>
    rejected(
      await saveLesson(a, LESSON, { status: 'in_progress' }),
      'a write after deletion',
    ),
  );
  await check("B's rows are untouched by A's deletion", async () =>
    sameSnapshot(await snapshot(b), bBefore) ? null : "B's rows changed",
  );
}

async function runChecks(env: Env, created: TestUser[]): Promise<void> {
  const a = await signUpTestUser(env, 'a');
  created.push(a);
  const b = await signUpTestUser(env, 'b');
  created.push(b);
  const anon = makeClient(env);
  console.log(
    `Project ${new URL(env.url).host}, anon key only. Test users: ${a.email}, ${b.email}\n`,
  );

  await check('sign-up trigger created A its own profile row', async () => {
    const { data, error } = await a.db.from('profiles').select('id');
    const rows = rowsOf(data);
    return (
      error?.message ??
      (rows.length === 1 && rows[0]?.id === a.id ? null : 'profile row missing')
    );
  });
  await check('A can write own rows in all four tables', async () => seed(a));
  await check('B can write own rows in all four tables', async () => seed(b));
  const bBefore = await snapshot(b);

  for (const spec of SPECS) {
    await crossUserChecks(a, b, anon, spec);
  }
  await upsertAndFunctionChecks(a, b, anon);
  await lessonRuleChecks(a);
  await labAndQuizRuleChecks(a);
  await check("B's rows are untouched after every attack by A", async () =>
    sameSnapshot(await snapshot(b), bBefore) ? null : "B's rows changed",
  );
  await deleteAccountChecks(a, b, env, bBefore);
}

async function main(): Promise<number> {
  const created: TestUser[] = [];
  let setupFailed = false;
  try {
    await runChecks(loadEnv(), created);
  } catch (error) {
    if (error instanceof SetupError) {
      // A problem the owner can fix: say what to do, without a stack trace.
      console.error(`\n${error.message}\n`);
      setupFailed = true;
    } else {
      recordFailure(`unexpected error: ${describeError(error)}`);
    }
  } finally {
    await cleanUp(created);
  }
  const { passed, failed } = totals();
  if (setupFailed) {
    console.log(
      `Stopped early (${String(passed)} passed, ${String(failed)} failed).`,
    );
    return 1;
  }
  console.log(`\n${String(passed)} passed, ${String(failed)} failed`);
  if (failed > 0) {
    console.log('RLS check FAILED. Do not deploy until every check passes.');
    return 1;
  }
  console.log('RLS check passed. You can turn "Confirm email" back on now.');
  return 0;
}

process.exitCode = await main();
