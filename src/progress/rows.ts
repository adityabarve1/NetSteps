// Translation between Supabase rows and the progress types (see
// supabase/migrations/0001_init.sql for the columns). Pure: no network, no clock.
//
// Rows are only ever SENT with the columns the app owns. `updated_at` is
// server-owned and never sent. `completed_at` is sent only when the record has a
// time: a completed record without one is sent without it, and the database
// trigger fills in the server time (its CHECK runs after the trigger).
import { isValidQuiz, isValidTimestamp, submitQuiz } from '@/progress/logic';
import { parseProgress } from '@/progress/parse';
import type {
  LabRecord,
  LessonId,
  LessonRecord,
  ProgressState,
} from '@/progress/types';

export type Row = Record<string, unknown>;

export const LESSON_COLUMNS = 'lesson_id,status,last_opened_at,completed_at';
export const LAB_COLUMNS = 'lab_id,status,completed_at';
export const ATTEMPT_COLUMNS = 'lesson_id,score,total,created_at';

export function lessonRow(
  userId: string,
  id: LessonId,
  record: LessonRecord,
): Row {
  return {
    user_id: userId,
    lesson_id: id,
    status: record.status,
    last_opened_at: record.lastOpenedAt,
    ...(record.completedAt === undefined
      ? {}
      : { completed_at: record.completedAt }),
  };
}

export function labRow(userId: string, id: string, record: LabRecord): Row {
  return {
    user_id: userId,
    lab_id: id,
    status: record.status,
    ...(record.completedAt === undefined
      ? {}
      : { completed_at: record.completedAt }),
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

// Postgres writes "2026-03-01T10:00:00.123456+00:00"; this app writes
// "2026-03-01T10:00:00.123Z". Both are the same moment, so a time that can be
// read is rewritten the app's way, and times then compare and tie-break the same
// whichever side they came from. Anything unreadable is left for parseProgress
// to drop.
function normalised(value: unknown): unknown {
  if (!isValidTimestamp(value)) return value;
  return new Date(Date.parse(value)).toISOString();
}

interface Attempt {
  lessonId: string;
  score: number;
  total: number;
  at: string;
}

// A score is never thrown away because of its time: an attempt whose time cannot
// be read counts as the oldest one.
const UNREADABLE_TIME = '1970-01-01T00:00:00.000Z';

function attemptsOf(value: unknown): Attempt[] {
  return rowsOf(value).flatMap((row) => {
    const time = normalised(row.created_at);
    if (
      typeof row.lesson_id !== 'string' ||
      row.lesson_id === '' ||
      !isValidQuiz({ score: row.score, total: row.total })
    ) {
      return [];
    }
    return [
      {
        lessonId: row.lesson_id,
        score: row.score as number,
        total: row.total as number,
        at: isValidTimestamp(time) ? time : UNREADABLE_TIME,
      },
    ];
  });
}

/**
 * The best score per lesson across ALL attempts, found with the same rule the
 * app uses on screen (`submitQuiz`: highest ratio, compared exactly). Newest
 * attempts go first so that a lesson known only from attempts is stamped with its
 * latest attempt time. Lessons that have no attempts are absent.
 */
export function bestsFromAttempts(rows: unknown): ProgressState {
  // Times are all in one format now, so comparing the text compares the moments.
  const newestFirst = attemptsOf(rows).sort((a, b) => b.at.localeCompare(a.at));
  let state: ProgressState = { lessons: {}, labs: {} };
  for (const attempt of newestFirst) {
    state = submitQuiz(
      state,
      attempt.lessonId,
      attempt.score,
      attempt.total,
      attempt.at,
    );
  }
  return state;
}

function keyedBy(rows: Row[], idColumn: string, pick: (row: Row) => unknown) {
  return Object.fromEntries(
    rows.flatMap((row) => {
      const id = row[idColumn];
      return typeof id === 'string' ? [[id, pick(row)] as const] : [];
    }),
  );
}

/** Turns raw rows from the three tables into a `ProgressState`. Never throws. */
export function progressFromRows(input: {
  lessons: unknown;
  labs: unknown;
  attempts: unknown;
}): ProgressState {
  const base = parseProgress({
    lessons: keyedBy(rowsOf(input.lessons), 'lesson_id', (row) => ({
      status: row.status,
      lastOpenedAt: normalised(row.last_opened_at),
      completedAt: normalised(row.completed_at),
    })),
    labs: keyedBy(rowsOf(input.labs), 'lab_id', (row) => ({
      status: row.status,
      completedAt: normalised(row.completed_at),
    })),
  });

  // Attach the best score without touching the lesson's own times. A Map keeps
  // an id such as "__proto__" an ordinary key.
  const lessons = new Map<string, LessonRecord>(Object.entries(base.lessons));
  for (const [id, fromAttempts] of Object.entries(
    bestsFromAttempts(input.attempts).lessons,
  )) {
    const existing = lessons.get(id);
    const quizBest = fromAttempts.quizBest;
    if (existing === undefined) {
      lessons.set(id, fromAttempts);
    } else if (quizBest !== undefined) {
      lessons.set(id, { ...existing, quizBest });
    }
  }
  return { lessons: Object.fromEntries(lessons), labs: base.labs };
}
