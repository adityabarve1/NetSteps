// Pure progress rules (spec section 10). No React, no clock, no storage and no
// randomness: time arrives as an ISO string argument (`at`), every function
// returns a new state and never changes what it was given. Unchanged parts are
// shared with the old state, and a call that changes nothing returns the very
// same state object, so callers can compare references to skip a save.
//
// The functions guard VALUES that a hand-edited localStorage could break
// (unreadable times, impossible quiz results). They REQUIRE the SHAPE to be
// right: anything read from localStorage or Supabase must go through
// `parseProgress` (parse.ts) first, which always returns a well-shaped state.
import type {
  CurriculumLevel,
  LabRecord,
  LessonId,
  LessonRecord,
  ProgressState,
  QuizBest,
} from '@/progress/types';

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------

// Only a full ISO 8601 timestamp with a zone ("Z" or "+hh:mm") counts as a
// time. Date.parse also accepts looser text ("1", "12/31/9999") in ways that
// differ between engines, and a time without a zone is read in the device's own
// zone, so two devices would disagree. Anything else is "unreadable": it is
// older than every real time when looking for the latest, newer than every real
// time when looking for the earliest, so it can never win.
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function instantOf(time: string): number {
  return ISO_TIMESTAMP.test(time) ? Date.parse(time) : Number.NaN;
}

// True for a readable time. Shared with parseProgress so both agree on it.
export function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(instantOf(value));
}

// 1 when `a` is a later moment than `b`, -1 when earlier, 0 when the same
// moment (or when both are unreadable).
function compareLatest(a: string, b: string): number {
  const x = instantOf(a);
  const y = instantOf(b);
  if (Number.isNaN(x)) return Number.isNaN(y) ? 0 : -1;
  if (Number.isNaN(y)) return 1;
  return Math.sign(x - y);
}

// Ties (one instant written two ways, or two unreadable times) are settled on
// the raw text: the later text for "latest", the earlier text for "earliest".
// That keeps the answer the same whichever argument comes first, which the
// merge laws below depend on.
function laterOf(a: string, b: string): string {
  const order = compareLatest(a, b);
  if (order !== 0) return order > 0 ? a : b;
  return a >= b ? a : b;
}

function earlierOf(a: string, b: string): string {
  const x = instantOf(a);
  const y = instantOf(b);
  if (Number.isNaN(x) !== Number.isNaN(y)) return Number.isNaN(x) ? b : a;
  if (x !== y && !Number.isNaN(x)) return x < y ? a : b;
  return a <= b ? a : b;
}

function earliestDefined(
  a: string | undefined,
  b: string | undefined,
): string | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return earlierOf(a, b);
}

// ---------------------------------------------------------------------------
// Quiz results
// ---------------------------------------------------------------------------

// A usable result: whole numbers, a positive total and 0 <= score <= total.
// Anything else (hand-edited storage) is treated as "no result".
export function isValidQuiz(q: unknown): q is QuizBest {
  if (typeof q !== 'object' || q === null) return false;
  const { score, total } = q as { score?: unknown; total?: unknown };
  return (
    typeof score === 'number' &&
    typeof total === 'number' &&
    Number.isSafeInteger(score) &&
    Number.isSafeInteger(total) &&
    total > 0 &&
    score >= 0 &&
    score <= total
  );
}

// Compares score/total ratios by cross-multiplication in BigInt, so 3/5 against
// 5/10 is decided exactly, with no floating-point rounding.
function compareRatio(a: QuizBest, b: QuizBest): number {
  const left = BigInt(a.score) * BigInt(b.total);
  const right = BigInt(b.score) * BigInt(a.total);
  if (left === right) return 0;
  return left > right ? 1 : -1;
}

// ---------------------------------------------------------------------------
// Lookups and updates
// ---------------------------------------------------------------------------

// Reads an own entry only, so an id such as "constructor" or "toString" is
// never mistaken for a record inherited from Object.prototype.
function own<T>(table: Record<string, T>, id: string): T | undefined {
  return Object.hasOwn(table, id) ? table[id] : undefined;
}

// Spreading with a computed key always makes an own property, even for the id
// "__proto__", so a hostile id cannot change the table's prototype.
function withLesson(
  s: ProgressState,
  id: LessonId,
  record: LessonRecord,
): ProgressState {
  return { ...s, lessons: { ...s.lessons, [id]: record } };
}

function withLab(
  s: ProgressState,
  id: string,
  record: LabRecord,
): ProgressState {
  return { ...s, labs: { ...s.labs, [id]: record } };
}

export function emptyProgress(): ProgressState {
  return { lessons: {}, labs: {} };
}

// Opening writes `in_progress` for a new lesson. For a known lesson only
// `lastOpenedAt` moves, and only forward: a completed lesson stays completed,
// and an older `at` (a slow device, a replayed queue) cannot move it back.
export function openLesson(
  s: ProgressState,
  id: LessonId,
  at: string,
): ProgressState {
  const existing = own(s.lessons, id);
  if (existing === undefined) {
    return withLesson(s, id, { status: 'in_progress', lastOpenedAt: at });
  }
  if (compareLatest(at, existing.lastOpenedAt) <= 0) return s;
  return withLesson(s, id, { ...existing, lastOpenedAt: at });
}

// Keeps the best ratio. A result that is not better (including an equal ratio)
// leaves the existing record as it is. A result that cannot be real (not whole
// numbers, total <= 0, score outside 0..total) is rejected, not clamped, so a
// bad value can never look like a good score; the state comes back unchanged.
export function submitQuiz(
  s: ProgressState,
  id: LessonId,
  score: number,
  total: number,
  at: string,
): ProgressState {
  const result = { score, total };
  if (!isValidQuiz(result)) return s;
  const existing = own(s.lessons, id);
  if (existing === undefined) {
    return withLesson(s, id, {
      status: 'in_progress',
      lastOpenedAt: at,
      quizBest: result,
    });
  }
  const current = isValidQuiz(existing.quizBest)
    ? existing.quizBest
    : undefined;
  if (current !== undefined && compareRatio(result, current) <= 0) return s;
  return withLesson(s, id, { ...existing, quizBest: result });
}

// Sets `completedAt` once; later calls keep the first time. A lesson that was
// never opened gets a record with `lastOpenedAt` = `at`. Whether the learner
// may complete (simulation finished and quiz submitted) is `canComplete`.
export function completeLesson(
  s: ProgressState,
  id: LessonId,
  at: string,
): ProgressState {
  const existing = own(s.lessons, id);
  if (existing === undefined) {
    return withLesson(s, id, {
      status: 'completed',
      lastOpenedAt: at,
      completedAt: at,
    });
  }
  if (existing.status === 'completed' && existing.completedAt !== undefined) {
    return s;
  }
  return withLesson(s, id, {
    ...existing,
    status: 'completed',
    completedAt: existing.completedAt ?? at,
  });
}

// A lab record keeps no start time, so `at` is accepted for symmetry with the
// other calls but not stored. Starting never downgrades a completed lab.
export function startLab(
  s: ProgressState,
  labId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so every progress call takes (state, id, at); a lab record stores no start time
  _at: string,
): ProgressState {
  if (own(s.labs, labId) !== undefined) return s;
  return withLab(s, labId, { status: 'started' });
}

export function completeLab(
  s: ProgressState,
  labId: string,
  at: string,
): ProgressState {
  const existing = own(s.labs, labId);
  if (existing?.status === 'completed' && existing.completedAt !== undefined) {
    return s;
  }
  return withLab(s, labId, {
    status: 'completed',
    completedAt: existing?.completedAt ?? at,
  });
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

// mergeProgress is applied again and again, in either argument order, across
// devices and offline replays, so it must be a join: commutative
// (merge(a, b) = merge(b, a)), associative and idempotent (merge(a, a) = a).
// Every field is merged on its own with a rule that picks the maximum under a
// total order, which gives all three laws:
//   status       completed beats in_progress (and started)
//   completedAt  earliest wins; a missing one yields to a present one
//   lastOpenedAt latest wins
//   quizBest     higher ratio wins; a missing or impossible one yields. Equal
//                ratio with different totals (3/5 and 6/10): the larger total
//   ties         one instant written two ways, or two unreadable times, are
//                settled on the raw text (see laterOf and earlierOf)
// A lesson or lab on one side only is kept: it is merged with itself, which
// tidies it the same way as a merged one. Merged records hold only the known
// fields, so stray fields from an edited file are dropped and cannot make the
// two argument orders differ.
function mergeQuiz(
  a: QuizBest | undefined,
  b: QuizBest | undefined,
): QuizBest | undefined {
  const x = isValidQuiz(a) ? a : undefined;
  const y = isValidQuiz(b) ? b : undefined;
  if (x === undefined || y === undefined) {
    const only = x ?? y;
    return only === undefined
      ? undefined
      : { score: only.score, total: only.total };
  }
  const order = compareRatio(x, y);
  const best = order === 0 ? (x.total >= y.total ? x : y) : order > 0 ? x : y;
  return { score: best.score, total: best.total };
}

function mergeLesson(a: LessonRecord, b: LessonRecord): LessonRecord {
  const completedAt = earliestDefined(a.completedAt, b.completedAt);
  const quizBest = mergeQuiz(a.quizBest, b.quizBest);
  return {
    status:
      a.status === 'completed' || b.status === 'completed'
        ? 'completed'
        : 'in_progress',
    lastOpenedAt: laterOf(a.lastOpenedAt, b.lastOpenedAt),
    ...(completedAt === undefined ? {} : { completedAt }),
    ...(quizBest === undefined ? {} : { quizBest }),
  };
}

function mergeLab(a: LabRecord, b: LabRecord): LabRecord {
  const completedAt = earliestDefined(a.completedAt, b.completedAt);
  return {
    status:
      a.status === 'completed' || b.status === 'completed'
        ? 'completed'
        : 'started',
    ...(completedAt === undefined ? {} : { completedAt }),
  };
}

function mergeTable<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  join: (x: T, y: T) => T,
): Record<string, T> {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  return Object.fromEntries(
    [...ids].flatMap((id) => {
      const left = own(a, id) ?? own(b, id);
      const right = own(b, id) ?? left;
      if (left === undefined || right === undefined) return [];
      return [[id, join(left, right)] as const];
    }),
  );
}

export function mergeProgress(
  a: ProgressState,
  b: ProgressState,
): ProgressState {
  return {
    lessons: mergeTable(a.lessons, b.lessons, mergeLesson),
    labs: mergeTable(a.labs, b.labs, mergeLab),
  };
}

// ---------------------------------------------------------------------------
// Where to go next, and how far along
// ---------------------------------------------------------------------------

// Only lessons that are built and listed in the curriculum count; records for
// other ids are ignored. Picks the most recently opened incomplete lesson, ties
// going to the earlier lesson in course order (levels in the order given).
// With no such lesson, the first incomplete built lesson in course order.
// An opened lesson whose time is unreadable still counts as opened, just as
// the oldest one. Null when every built lesson is done or none is built.
export function continueTarget(
  s: ProgressState,
  levels: CurriculumLevel[],
): LessonId | null {
  let firstIncomplete: LessonId | null = null;
  let latest: { id: LessonId; at: string } | null = null;
  for (const level of levels) {
    for (const lesson of level.lessons) {
      if (!lesson.built) continue;
      const record = own(s.lessons, lesson.id);
      if (record?.status === 'completed') continue;
      firstIncomplete ??= lesson.id;
      if (
        record !== undefined &&
        (latest === null || compareLatest(record.lastOpenedAt, latest.at) > 0)
      ) {
        latest = { id: lesson.id, at: record.lastOpenedAt };
      }
    }
  }
  return latest?.id ?? firstIncomplete;
}

// Completed built lessons over built lessons. Unbuilt lessons count neither
// as done nor in the total, so an all-unbuilt level is 0 of 0.
export function levelProgress(
  s: ProgressState,
  level: CurriculumLevel,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const lesson of level.lessons) {
    if (!lesson.built) continue;
    total += 1;
    if (own(s.lessons, lesson.id)?.status === 'completed') done += 1;
  }
  return { done, total };
}

export function overallProgress(
  s: ProgressState,
  levels: CurriculumLevel[],
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const level of levels) {
    const part = levelProgress(s, level);
    done += part.done;
    total += part.total;
  }
  return { done, total };
}

// A lesson may be completed once the primary simulation reached its last step
// AND the quiz was submitted, in either order. Any quiz score counts and labs
// never gate completion.
export function canComplete(run: {
  primarySimFinished: boolean;
  quizSubmitted: boolean;
}): boolean {
  return run.primarySimFinished && run.quizSubmitted;
}
