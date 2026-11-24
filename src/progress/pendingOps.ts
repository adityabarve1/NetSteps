// The writes that wait in the offline queue, and the rules for keeping that list
// small and safe. Pure: no storage, no network.
//
// A queued write is a snapshot of one change. Replaying any of them is safe:
// lesson and lab upserts overwrite the same row with the same values, and a quiz
// attempt carries the id it was given, so the database ignores a second copy.
//
// In localStorage every write has its OWN key, `<base>.<seq>`, so two tabs of one
// account can add and remove writes without ever overwriting each other's. The
// `seq` is a sortable string (see `SEQ_PATTERN`) and sorting by it is the replay
// order.
import {
  isValidQuiz,
  isValidTimestamp,
  mergeProgress,
  submitQuiz,
} from '@/progress/logic';
import { parseProgress } from '@/progress/parse';
import type {
  LabRecord,
  LessonId,
  LessonRecord,
  ProgressState,
} from '@/progress/types';

/**
 * The most writes the queue holds. Lesson and lab writes fold into one per row,
 * so only quiz attempts can pile up. Past the cap the quiz attempts that no longer
 * matter go first (see `appendOp`). Lesson, lab and whole-state writes are never
 * dropped, so a completion is never lost to the cap, even if that means going over.
 */
export const MAX_PENDING_OPS = 500;

export type WriteOp =
  | { kind: 'lesson'; id: LessonId; record: LessonRecord }
  | { kind: 'lab'; id: string; record: LabRecord }
  | {
      kind: 'quiz';
      attemptId: string;
      lessonId: LessonId;
      score: number;
      total: number;
      at: string;
    }
  // The guest-to-account merge.
  | { kind: 'all'; state: ProgressState };

export type PendingOp = WriteOp & { seq: string };
type QuizOp = Extract<PendingOp, { kind: 'quiz' }>;

// ---------------------------------------------------------------------------
// Names in storage
// ---------------------------------------------------------------------------

/**
 * A `seq` is zero-padded milliseconds, a counter and a short random suffix, so it
 * sorts as text in the order the writes were made, even across tabs:
 * `000001780000000-000003-k3f9`.
 */
export const SEQ_PATTERN = /^\d{15}-\d{6}-[0-9a-z]{4}$/;

export const opKey = (base: string, seq: string): string => `${base}.${seq}`;

/**
 * The seq in a localStorage key, if the key is one of this queue's writes. The
 * old single key (`<base>` with nothing after it), another account's keys and
 * anything else give null.
 */
export function seqOfKey(base: string, storageKey: string): string | null {
  const head = `${base}.`;
  if (!storageKey.startsWith(head)) return null;
  const seq = storageKey.slice(head.length);
  return SEQ_PATTERN.test(seq) ? seq : null;
}

export const bySeq = (a: { seq: string }, b: { seq: string }): number =>
  a.seq < b.seq ? -1 : Number(a.seq > b.seq);

// ---------------------------------------------------------------------------
// Adding a write: fold, then cap
// ---------------------------------------------------------------------------

function ownRecord<T>(table: Record<string, T>, id: string): T | undefined {
  return Object.hasOwn(table, id) ? table[id] : undefined;
}

function joinLessons(
  a: LessonRecord,
  b: LessonRecord,
  id: string,
): LessonRecord {
  const merged = mergeProgress(
    { lessons: { [id]: a }, labs: {} },
    { lessons: { [id]: b }, labs: {} },
  );
  return ownRecord(merged.lessons, id) ?? b;
}

function joinLabs(a: LabRecord, b: LabRecord, id: string): LabRecord {
  const merged = mergeProgress(
    { lessons: {}, labs: { [id]: a } },
    { lessons: {}, labs: { [id]: b } },
  );
  return ownRecord(merged.labs, id) ?? b;
}

// The earlier write for the same row that the new one may absorb: the nearest
// one behind it, but never across a whole-state write and never the write that
// is already on its way to the server (it cannot be taken back).
function foldableIndex(
  queue: readonly PendingOp[],
  op: WriteOp,
  inFlight: string | null,
): number {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const earlier = queue[i];
    if (earlier === undefined || earlier.kind === 'all') return -1;
    const sameRow =
      (earlier.kind === 'lesson' &&
        op.kind === 'lesson' &&
        earlier.id === op.id) ||
      (earlier.kind === 'lab' && op.kind === 'lab' && earlier.id === op.id);
    if (sameRow) return earlier.seq === inFlight ? -1 : i;
  }
  return -1;
}

// "Not better" in the app's own sense (submitQuiz keeps the existing result for
// an equal or lower ratio), so this never re-implements the comparison.
function notBetter(candidate: QuizOp, than: QuizOp): boolean {
  const base: ProgressState = {
    lessons: {
      [than.lessonId]: {
        status: 'in_progress',
        lastOpenedAt: than.at,
        quizBest: { score: than.score, total: than.total },
      },
    },
    labs: {},
  };
  return (
    submitQuiz(
      base,
      than.lessonId,
      candidate.score,
      candidate.total,
      candidate.at,
    ) === base
  );
}

// Quiz attempts to give up first. For each lesson one attempt is kept as "the
// best" (the highest ratio; the newest of equals). Every other attempt for that
// lesson adds nothing to the best score, so those go first, oldest first. Only if
// that is not enough do the best ones go, oldest first.
function quizVictims(
  queue: readonly PendingOp[],
  inFlight: string | null,
): QuizOp[] {
  const quizzes = queue.filter(
    (op): op is QuizOp => op.kind === 'quiz' && op.seq !== inFlight,
  );
  const best = new Map<string, QuizOp>();
  for (const op of quizzes) {
    const held = best.get(op.lessonId);
    const worse =
      held !== undefined && notBetter(op, held) && !notBetter(held, op);
    if (!worse) best.set(op.lessonId, op);
  }
  const redundant = quizzes.filter((op) => best.get(op.lessonId) !== op);
  return [
    ...redundant,
    ...quizzes.filter((op) => best.get(op.lessonId) === op),
  ];
}

/**
 * Adds a write. A lesson or lab write is folded INTO the earlier write for the same
 * row, which keeps its place and its `seq` (so, in storage, its key is rewritten in
 * place); `held` is the seq of the write that now carries this one. Past the cap the
 * quiz attempts that matter least are dropped.
 */
export function appendOp(
  queue: readonly PendingOp[],
  op: WriteOp,
  seq: string,
  inFlight: string | null,
  max: number = MAX_PENDING_OPS,
): { queue: PendingOp[]; dropped: number; held: string } {
  let next: PendingOp[] = [...queue];
  let held = seq;

  const at =
    op.kind === 'lesson' || op.kind === 'lab'
      ? foldableIndex(next, op, inFlight)
      : -1;
  const earlier = at < 0 ? undefined : next[at];
  if (op.kind === 'lesson' && earlier?.kind === 'lesson') {
    next[at] = {
      ...earlier,
      record: joinLessons(earlier.record, op.record, op.id),
    };
    held = earlier.seq;
  } else if (op.kind === 'lab' && earlier?.kind === 'lab') {
    next[at] = {
      ...earlier,
      record: joinLabs(earlier.record, op.record, op.id),
    };
    held = earlier.seq;
  } else {
    next.push({ ...op, seq });
  }

  const excess = next.length - max;
  if (excess <= 0) return { queue: next, dropped: 0, held };
  const gone = new Set(
    quizVictims(next, inFlight)
      .slice(0, excess)
      .map((o) => o.seq),
  );
  next = next.filter((entry) => !gone.has(entry.seq));
  return { queue: next, dropped: gone.size, held };
}

// ---------------------------------------------------------------------------
// What the queued writes would add to a loaded state
// ---------------------------------------------------------------------------

/**
 * `load()` shows the server's rows PLUS the writes still waiting to be sent, so a
 * completion made offline does not vanish from the screen on the next load.
 */
export function overlayOps(
  base: ProgressState,
  ops: readonly PendingOp[],
): ProgressState {
  return ops.reduce<ProgressState>((state, op) => {
    switch (op.kind) {
      case 'lesson':
        return mergeProgress(state, {
          lessons: { [op.id]: op.record },
          labs: {},
        });
      case 'lab':
        return mergeProgress(state, {
          lessons: {},
          labs: { [op.id]: op.record },
        });
      case 'quiz':
        return submitQuiz(state, op.lessonId, op.score, op.total, op.at);
      case 'all':
        return mergeProgress(state, op.state);
    }
  }, base);
}

// ---------------------------------------------------------------------------
// One write in storage. Like everything else that comes from storage it is
// checked: a damaged write is skipped (and left where it is), the rest are kept.
// ---------------------------------------------------------------------------

const FORMAT_VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idOf(raw: Record<string, unknown>, field: string): string | undefined {
  const id = raw[field];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

function parseOp(seq: string, raw: unknown): PendingOp | undefined {
  if (!isObject(raw)) return undefined;
  switch (raw.kind) {
    case 'lesson': {
      const id = idOf(raw, 'id');
      if (id === undefined) return undefined;
      const record = ownRecord(
        parseProgress({ lessons: { [id]: raw.record }, labs: {} }).lessons,
        id,
      );
      return record === undefined
        ? undefined
        : { kind: 'lesson', seq, id, record };
    }
    case 'lab': {
      const id = idOf(raw, 'id');
      if (id === undefined) return undefined;
      const record = ownRecord(
        parseProgress({ lessons: {}, labs: { [id]: raw.record } }).labs,
        id,
      );
      return record === undefined
        ? undefined
        : { kind: 'lab', seq, id, record };
    }
    case 'quiz': {
      const lessonId = idOf(raw, 'lessonId');
      const { attemptId, score, total, at } = raw;
      if (
        lessonId === undefined ||
        typeof attemptId !== 'string' ||
        !UUID.test(attemptId) ||
        !isValidQuiz({ score, total }) ||
        !isValidTimestamp(at)
      ) {
        return undefined;
      }
      return {
        kind: 'quiz',
        seq,
        attemptId,
        lessonId,
        score: score as number,
        total: total as number,
        at,
      };
    }
    case 'all': {
      return { kind: 'all', seq, state: parseProgress(raw.state) };
    }
    default:
      return undefined;
  }
}

/** The write stored under `seq`, or undefined if what is stored is not a valid write. */
export function parseStoredOp(
  seq: string,
  raw: string | null,
): PendingOp | undefined {
  if (raw === null) return undefined;
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!isObject(envelope) || envelope.v !== FORMAT_VERSION) return undefined;
    return parseOp(seq, envelope.op);
  } catch {
    return undefined;
  }
}

export function serializeOp(op: PendingOp): string {
  // The seq lives in the key, not in the value.
  const write = Object.fromEntries(
    Object.entries(op).filter(([field]) => field !== 'seq'),
  );
  return JSON.stringify({ v: FORMAT_VERSION, op: write });
}
