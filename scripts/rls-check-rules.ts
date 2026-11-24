// Database rules enforced by triggers and constraints in 0001_init.sql: completion is
// permanent (no downgrade by a stale device), keys never move, the server owns
// updated_at, and quiz and status values are validated. Part of rls-check.ts.
import {
  check,
  firstError,
  hidden,
  rejected,
  rowsOf,
} from './rls-check-helpers.ts';
import type { Problem, Row, TestUser } from './rls-check-helpers.ts';

export const LESSON = 'rls-check-lesson';
export const LAB = 'rls-check-lab';
const T1 = '2026-02-01T10:00:00.000Z';
const T2 = '2026-03-01T10:00:00.000Z';
const T3 = '2026-04-01T10:00:00.000Z';

const sameTime = (value: unknown, iso: string): boolean =>
  typeof value === 'string' && Date.parse(value) === Date.parse(iso);

// The app saves with an upsert, so these helpers do too.
export function saveLesson(user: TestUser, lessonId: string, fields: Row) {
  return user.db
    .from('lesson_progress')
    .upsert(
      { user_id: user.id, lesson_id: lessonId, ...fields },
      { onConflict: 'user_id,lesson_id' },
    );
}

export function saveLab(user: TestUser, labId: string, fields: Row) {
  return user.db
    .from('lab_progress')
    .upsert(
      { user_id: user.id, lab_id: labId, ...fields },
      { onConflict: 'user_id,lab_id' },
    );
}

async function readOwn(
  user: TestUser,
  table: string,
  column: string,
  value: string,
): Promise<Row> {
  const { data, error } = await user.db
    .from(table)
    .select('*')
    .eq(column, value);
  if (error) {
    throw new Error(error.message);
  }
  const row = rowsOf(data)[0];
  if (row === undefined) {
    throw new Error(`no ${table} row with ${column} = ${value}`);
  }
  return row;
}

const readLesson = (user: TestUser, lessonId: string) =>
  readOwn(user, 'lesson_progress', 'lesson_id', lessonId);

/** Passes when the row is completed with exactly the given completed_at. */
function completedAt(row: Row, iso: string): Problem {
  return row.status === 'completed' && sameTime(row.completed_at, iso)
    ? null
    : `expected completed at ${iso}, got status=${String(row.status)} completed_at=${String(row.completed_at)}`;
}

export async function lessonRuleChecks(a: TestUser): Promise<void> {
  const completed = {
    status: 'completed',
    completed_at: T1,
    last_opened_at: T1,
  };
  await check(
    'first completion by upsert keeps the completed_at it sent',
    async () =>
      firstError(await saveLesson(a, LESSON, completed)) ??
      completedAt(await readLesson(a, LESSON), T1),
  );
  await check(
    'repeat completion keeps the ORIGINAL completed_at',
    async () =>
      firstError(
        await saveLesson(a, LESSON, { ...completed, completed_at: T2 }),
      ) ?? completedAt(await readLesson(a, LESSON), T1),
  );
  await check(
    'stale in_progress upsert after completion leaves it completed',
    async () => {
      const stale = {
        status: 'in_progress',
        completed_at: null,
        last_opened_at: T3,
      };
      const error = firstError(await saveLesson(a, LESSON, stale));
      const row = await readLesson(a, LESSON);
      return (
        error ??
        completedAt(row, T1) ??
        (sameTime(row.last_opened_at, T3)
          ? null
          : 'last_opened_at was not updated')
      );
    },
  );
  await check(
    'direct update to in_progress cannot undo completion',
    async () => {
      await a.db
        .from('lesson_progress')
        .update({ status: 'in_progress', completed_at: null })
        .eq('lesson_id', LESSON);
      return completedAt(await readLesson(a, LESSON), T1);
    },
  );
  await check('completed_at cannot be rewritten after completion', async () => {
    await a.db
      .from('lesson_progress')
      .update({ completed_at: '1999-01-01T00:00:00.000Z' })
      .eq('lesson_id', LESSON);
    return completedAt(await readLesson(a, LESSON), T1);
  });
  await check('updated_at is set by the server, not the client', async () => {
    await a.db
      .from('lesson_progress')
      .update({ updated_at: '2000-01-01T00:00:00.000Z' })
      .eq('lesson_id', LESSON);
    const { updated_at: updatedAt } = await readLesson(a, LESSON);
    return typeof updatedAt === 'string' &&
      Date.parse(updatedAt) > Date.parse('2020-01-01')
      ? null
      : `updated_at was ${String(updatedAt)}`;
  });
  await check('lesson_id cannot be renamed on an existing row', async () => {
    const renamed = hidden(
      await a.db
        .from('lesson_progress')
        .update({ lesson_id: 'renamed' })
        .eq('lesson_id', LESSON)
        .select(),
      'a rename',
    );
    return renamed ?? completedAt(await readLesson(a, LESSON), T1);
  });
  await check(
    'a new lesson saved as completed keeps the time it sent',
    async () =>
      firstError(
        await saveLesson(a, `${LESSON}-2`, {
          status: 'completed',
          completed_at: T1,
        }),
      ) ?? completedAt(await readLesson(a, `${LESSON}-2`), T1),
  );
  await check(
    'completion sent without a time gets the server time',
    async () => {
      const error = firstError(
        await saveLesson(a, `${LESSON}-3`, { status: 'completed' }),
      );
      const row = await readLesson(a, `${LESSON}-3`);
      return (
        error ??
        (row.status === 'completed' && row.completed_at !== null
          ? null
          : 'no completed_at')
      );
    },
  );
  await check('an in_progress row cannot carry a completed_at', async () => {
    const error = firstError(
      await saveLesson(a, `${LESSON}-4`, {
        status: 'in_progress',
        completed_at: T1,
      }),
    );
    const row = await readLesson(a, `${LESSON}-4`);
    return (
      error ?? (row.completed_at === null ? null : 'completed_at was kept')
    );
  });
  await check('an unknown lesson status is rejected', async () =>
    rejected(
      await saveLesson(a, `${LESSON}-5`, { status: 'bogus' }),
      'status bogus',
    ),
  );
}

export async function labAndQuizRuleChecks(a: TestUser): Promise<void> {
  await check('a completed lab cannot be downgraded to started', async () => {
    const done = firstError(
      await saveLab(a, LAB, { status: 'completed', completed_at: T1 }),
    );
    const stale = firstError(
      await saveLab(a, LAB, { status: 'started', completed_at: null }),
    );
    const row = await readOwn(a, 'lab_progress', 'lab_id', LAB);
    return done ?? stale ?? completedAt(row, T1);
  });
  await check('an unknown lab status is rejected', async () =>
    rejected(await saveLab(a, `${LAB}-2`, { status: 'bogus' }), 'status bogus'),
  );
  const attempt = (score: number, total: number) =>
    a.db
      .from('quiz_attempts')
      .insert({ user_id: a.id, lesson_id: LESSON, score, total });
  await check('quiz attempt with total 0 is rejected', async () =>
    rejected(await attempt(0, 0), 'total 0'),
  );
  await check('quiz attempt with score above total is rejected', async () =>
    rejected(await attempt(6, 5), 'score 6 of 5'),
  );
  await check('quiz attempt with a negative score is rejected', async () =>
    rejected(await attempt(-1, 5), 'score -1'),
  );
  await check('a valid quiz attempt (5 of 5) is accepted', async () =>
    firstError(await attempt(5, 5)),
  );
}
