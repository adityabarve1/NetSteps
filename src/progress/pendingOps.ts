// The writes that wait in the offline queue, and the rules for keeping that list
// small and safe. Pure: no storage, no network.
//
// A queued write is a snapshot of one change. Replaying any of them is safe:
// lesson and lab upserts overwrite the same row with the same values, and a quiz
// attempt carries the id it was given, so the database ignores a second copy.
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
  // The guest-to-account merge. `attemptIds` holds one pre-made id per lesson
  // that has a quiz score, so a replay inserts the same attempt, never a new one.
  | { kind: 'all'; state: ProgressState; attemptIds: Record<LessonId, string> };

export type PendingOp = WriteOp & { seq: number };
type QuizOp = Extract<PendingOp, { kind: 'quiz' }>;

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
  inFlight: number | null,
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
  inFlight: number | null,
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

export function appendOp(
  queue: readonly PendingOp[],
  op: WriteOp,
  seq: number,
  inFlight: number | null,
  max: number = MAX_PENDING_OPS,
): { queue: PendingOp[]; dropped: number } {
  let next: PendingOp[] = [...queue];
  let added: PendingOp = { ...op, seq };

  if (op.kind === 'lesson' || op.kind === 'lab') {
    const at = foldableIndex(next, op, inFlight);
    const earlier = at < 0 ? undefined : next[at];
    if (earlier !== undefined) {
      next = next.filter((entry) => entry.seq !== earlier.seq);
      if (op.kind === 'lesson' && earlier.kind === 'lesson') {
        added = {
          ...op,
          seq,
          record: joinLessons(earlier.record, op.record, op.id),
        };
      } else if (op.kind === 'lab' && earlier.kind === 'lab') {
        added = {
          ...op,
          seq,
          record: joinLabs(earlier.record, op.record, op.id),
        };
      }
    }
  }
  next.push(added);

  const excess = next.length - max;
  if (excess <= 0) return { queue: next, dropped: 0 };
  const gone = new Set(
    quizVictims(next, inFlight)
      .slice(0, excess)
      .map((o) => o.seq),
  );
  return {
    queue: next.filter((entry) => !gone.has(entry.seq)),
    dropped: gone.size,
  };
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
// Reading the queue back from storage. Like everything else that comes from
// storage it is checked: a damaged write is skipped, the rest are kept.
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

function parseOp(raw: unknown): PendingOp | undefined {
  if (!isObject(raw)) return undefined;
  const { seq } = raw;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) {
    return undefined;
  }
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
      const ids = isObject(raw.attemptIds) ? raw.attemptIds : {};
      return {
        kind: 'all',
        seq,
        state: parseProgress(raw.state),
        attemptIds: Object.fromEntries(
          Object.entries(ids).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && UUID.test(entry[1]),
          ),
        ),
      };
    }
    default:
      return undefined;
  }
}

export function parsePending(raw: string | null): PendingOp[] {
  if (raw === null) return [];
  try {
    const envelope: unknown = JSON.parse(raw);
    if (
      !isObject(envelope) ||
      envelope.v !== FORMAT_VERSION ||
      !Array.isArray(envelope.ops)
    ) {
      return [];
    }
    return envelope.ops.flatMap((entry: unknown) => {
      const op = parseOp(entry);
      return op === undefined ? [] : [op];
    });
  } catch {
    return [];
  }
}

export function serializePending(ops: readonly PendingOp[]): string {
  return JSON.stringify({ v: FORMAT_VERSION, ops });
}
