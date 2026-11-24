// Who may see and change whose rows: cross-user reads, writes and reassignments,
// signed-out access, and the functions clients must not be able to call.
// Part of rls-check.ts.
import {
  check,
  firstError,
  hidden,
  rejected,
  rowsOf,
} from './rls-check-helpers.ts';
import type { Db, Problem, Row, TestUser } from './rls-check-helpers.ts';
import { LAB, LESSON, saveLab, saveLesson } from './rls-check-rules.ts';

export interface TableSpec {
  table: string;
  /** Column that holds the owner's user id. */
  owner: 'id' | 'user_id';
  /** An edit that would be visible if it landed. */
  patch: Row;
  /** A row owned by the given user, for insert attempts. */
  rowFor: (userId: string) => Row;
}

export const SPECS: TableSpec[] = [
  {
    table: 'profiles',
    owner: 'id',
    patch: { display_name: 'hijacked' },
    rowFor: (userId) => ({ id: userId, display_name: 'intruder' }),
  },
  {
    table: 'lesson_progress',
    owner: 'user_id',
    patch: { status: 'completed' },
    rowFor: (userId) => ({ user_id: userId, lesson_id: 'rls-intruder' }),
  },
  {
    table: 'quiz_attempts',
    owner: 'user_id',
    patch: { score: 0 },
    rowFor: (userId) => ({
      user_id: userId,
      lesson_id: 'rls-intruder',
      score: 1,
      total: 5,
    }),
  },
  {
    table: 'lab_progress',
    owner: 'user_id',
    patch: { status: 'completed' },
    rowFor: (userId) => ({ user_id: userId, lab_id: 'rls-intruder' }),
  },
];

export type Snapshot = Record<string, string[]>;

/** Every row of every table the user can see, as sorted JSON, to spot any change. */
export async function snapshot(user: TestUser): Promise<Snapshot> {
  const rowsByTable: Snapshot = {};
  for (const { table } of SPECS) {
    const { data, error } = await user.db.from(table).select('*');
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    rowsByTable[table] = rowsOf(data)
      .map((row) => JSON.stringify(row))
      .sort();
  }
  return rowsByTable;
}

export const sameSnapshot = (x: Snapshot, y: Snapshot): boolean =>
  JSON.stringify(x) === JSON.stringify(y);

export const tablesWithoutRows = (snap: Snapshot): string[] =>
  Object.entries(snap)
    .filter(([, rows]) => rows.length === 0)
    .map(([table]) => table);

export async function seed(user: TestUser): Promise<Problem> {
  return firstError(
    await user.db
      .from('profiles')
      .update({ display_name: `RLS check ${user.label}` })
      .eq('id', user.id)
      .select(),
    await saveLesson(user, LESSON, { status: 'in_progress' }),
    await user.db
      .from('quiz_attempts')
      .insert({ user_id: user.id, lesson_id: LESSON, score: 3, total: 5 }),
    await saveLab(user, LAB, { status: 'started' }),
  );
}

export async function crossUserChecks(
  a: TestUser,
  b: TestUser,
  anon: Db,
  spec: TableSpec,
): Promise<void> {
  const { table, owner, patch } = spec;
  await check(`${table}: A reads only A's own rows`, async () => {
    const { data, error } = await a.db.from(table).select('*');
    if (error) {
      return error.message;
    }
    const rows = rowsOf(data);
    return rows.length > 0 && rows.every((row) => row[owner] === a.id)
      ? null
      : `expected only A's rows, got owners ${JSON.stringify(rows.map((row) => row[owner]))}`;
  });
  await check(`${table}: A cannot read B's rows`, async () =>
    hidden(await a.db.from(table).select('*').eq(owner, b.id), "B's rows"),
  );
  await check(`${table}: A cannot update B's rows`, async () =>
    hidden(
      await a.db.from(table).update(patch).eq(owner, b.id).select(),
      "an update of B's rows",
    ),
  );
  await check(`${table}: A cannot insert a row owned by B`, async () =>
    rejected(
      await a.db.from(table).insert(spec.rowFor(b.id)),
      'an insert for B',
    ),
  );
  await check(`${table}: A cannot reassign own row to B`, async () =>
    hidden(
      await a.db
        .from(table)
        .update({ [owner]: b.id })
        .eq(owner, a.id)
        .select(),
      'a reassignment to B',
    ),
  );
  await check(
    `${table}: A cannot delete own rows (no delete policy)`,
    async () => {
      const problem = hidden(
        await a.db.from(table).delete().eq(owner, a.id).select(),
        'a delete',
      );
      if (problem !== null) {
        return problem;
      }
      const { data } = await a.db.from(table).select('*');
      return rowsOf(data).length > 0
        ? null
        : "A's rows vanished after the delete";
    },
  );
  await check(`${table}: signed-out client reads no rows`, async () =>
    hidden(await anon.from(table).select('*'), 'an anonymous read'),
  );
  await check(`${table}: signed-out client cannot insert`, async () =>
    rejected(
      await anon.from(table).insert(spec.rowFor(a.id)),
      'an anonymous insert',
    ),
  );
}

export async function upsertAndFunctionChecks(
  a: TestUser,
  b: TestUser,
  anon: Db,
): Promise<void> {
  await check(
    "lesson_progress: A cannot overwrite B's row by upsert",
    async () =>
      rejected(
        await saveLesson(a, LESSON, { user_id: b.id, status: 'completed' }),
        "an upsert onto B's row",
      ),
  );
  await check("lab_progress: A cannot overwrite B's row by upsert", async () =>
    rejected(
      await saveLab(a, LAB, { user_id: b.id, status: 'completed' }),
      "an upsert onto B's row",
    ),
  );
  await check('signed-out client cannot call delete_my_account', async () =>
    rejected(await anon.rpc('delete_my_account'), 'an anonymous call'),
  );
  await check('delete_my_account cannot be aimed at another user', async () =>
    rejected(
      await a.db.rpc('delete_my_account', { user_id: b.id }),
      'a call naming B',
    ),
  );
  for (const fn of [
    'handle_new_user',
    'lesson_progress_guard',
    'lab_progress_guard',
  ]) {
    await check(`signed-in client cannot call ${fn}()`, async () =>
      rejected(await a.db.rpc(fn), `a call to ${fn}`),
    );
  }
}
