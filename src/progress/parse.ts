// The one door for progress that comes from outside: localStorage text, or rows
// from Supabase. The logic in logic.ts needs a well-shaped state; this turns
// ANYTHING into one. It never throws and always returns a fresh `ProgressState`
// that shares nothing with its input.
//
// Rules: a whole value that is not a plain object becomes an empty state; a
// table that is missing or not a plain object becomes {}; a record that is not
// well-formed is dropped; unknown fields are dropped. Times and quiz results
// are checked with the same rules the logic uses (isValidTimestamp and
// isValidQuiz), so what comes out is never "unreadable" to merge or open.
import { emptyProgress, isValidQuiz, isValidTimestamp } from '@/progress/logic';
import type { LabRecord, LessonRecord, ProgressState } from '@/progress/types';

// Plain means made by an object literal or JSON.parse (or with no prototype):
// arrays, Maps, Dates and class instances are not.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// A record with a valid status and an open time, or nothing.
// A completed lesson whose completedAt is missing or unreadable is KEPT, as
// completed with no completedAt: dropping it would lose a real completion, and
// borrowing lastOpenedAt would invent a time. The logic already copes: merge
// takes a completedAt from the other side if it has one, and completeLesson
// fills a missing one.
function parseLesson(raw: unknown): LessonRecord | undefined {
  if (!isPlainObject(raw)) return undefined;
  const { status, lastOpenedAt, completedAt, quizBest } = raw;
  if (status !== 'in_progress' && status !== 'completed') return undefined;
  if (!isValidTimestamp(lastOpenedAt)) return undefined;
  return {
    status,
    lastOpenedAt,
    ...(isValidTimestamp(completedAt) ? { completedAt } : {}),
    ...(isValidQuiz(quizBest)
      ? { quizBest: { score: quizBest.score, total: quizBest.total } }
      : {}),
  };
}

function parseLab(raw: unknown): LabRecord | undefined {
  if (!isPlainObject(raw)) return undefined;
  const { status, completedAt } = raw;
  if (status !== 'started' && status !== 'completed') return undefined;
  return {
    status,
    ...(isValidTimestamp(completedAt) ? { completedAt } : {}),
  };
}

// Own keys only, through entries and fromEntries: an id such as "__proto__"
// (which JSON.parse makes an ordinary own key) stays an ordinary own key and
// never reaches a prototype. An empty id is dropped.
function parseTable<T>(
  raw: unknown,
  parseRecord: (record: unknown) => T | undefined,
): Record<string, T> {
  if (!isPlainObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([id, record]) => {
      const parsed = id === '' ? undefined : parseRecord(record);
      return parsed === undefined ? [] : [[id, parsed] as const];
    }),
  );
}

export function parseProgress(raw: unknown): ProgressState {
  try {
    if (!isPlainObject(raw)) return emptyProgress();
    return {
      lessons: parseTable(raw.lessons, parseLesson),
      labs: parseTable(raw.labs, parseLab),
    };
  } catch {
    // Plain JSON cannot hold a getter that throws or a revoked proxy, so this
    // only guards exotic values. It keeps "never throws" literally true.
    return emptyProgress();
  }
}
