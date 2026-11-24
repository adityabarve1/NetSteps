// Progress for a signed-in learner, in Supabase (tables and policies:
// supabase/migrations/0001_init.sql). Reads are direct; every write goes through
// the offline queue (pendingQueue.ts), so a failed write is kept and retried
// rather than lost, and nothing here rejects to the screen.
//
// How a guest's quiz score reaches the account EXACTLY ONCE (saveAll):
//   * a guest holds only a BEST score, so there is one attempt to add per lesson;
//   * saveAll first reads the account's own best (paged, all attempts) and inserts
//     an attempt only where the guest's score is STRICTLY better. Merging the same
//     guest data again finds the score already there and adds nothing;
//   * the id of that attempt is made FROM the score (attemptId.ts: account,
//     lesson, score, total), and the insert is ON CONFLICT (id) DO NOTHING. Two tabs
//     merging at the same moment, a replay of a merge whose first try really reached
//     the server, and a merge months later all make the same id, so they can never
//     add a second row. (An ordinary quiz submit keeps a random id: each submit is
//     its own attempt.)
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidQuiz, isValidTimestamp, submitQuiz } from '@/progress/logic';
import { mergeAttemptId } from '@/progress/attemptId';
import { parseProgress } from '@/progress/parse';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { createPendingQueue } from '@/progress/pendingQueue';
import { judgeFailure, RemoteFailure } from '@/progress/remoteFailure';
import {
  ATTEMPT_COLUMNS,
  bestsFromAttempts,
  LAB_COLUMNS,
  labRow,
  LESSON_COLUMNS,
  lessonRow,
  progressFromRows,
} from '@/progress/rows';
import type { Row } from '@/progress/rows';
import type { AccountStore } from '@/progress/store';
import { randomUuid } from '@/progress/uuid';

/** PostgREST answers at most 1000 rows per request (Supabase's default). */
const PAGE_SIZE = 1000;
/** 100 pages is 100,000 rows. A learner has a few dozen; more is a fault, not progress. */
const DEFAULT_MAX_PAGES = 100;
/** A batch is split into requests of at most this many rows. */
const CHUNK_SIZE = 200;
/** A request that has not answered by now counts as a network failure, so one stuck request cannot stall every replay. */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * The key prefix of an account's queued writes. Each write is stored under its own
 * key, `<prefix>.<seq>` (see pendingQueue.ts), so tabs never overwrite each other.
 */
export const pendingKey = (userId: string): string =>
  `netsteps.pending.${userId}`;

interface Reply {
  data: unknown;
  error: { message: string; code?: string } | null;
  status: number;
}
interface Query extends PromiseLike<Reply> {
  abortSignal(signal: AbortSignal): PromiseLike<Reply>;
}
interface UpsertOptions {
  onConflict: string;
  ignoreDuplicates?: boolean;
}

export interface SupabaseStoreOptions {
  /** Makes quiz attempt ids; for tests. */
  newId?: () => string;
  /** Pages read before giving up; for tests. */
  maxPages?: number;
}

export function createSupabaseStore(
  client: SupabaseClient,
  userId: string,
  options: SupabaseStoreOptions = {},
): AccountStore {
  const newId = options.newId ?? randomUuid;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;

  // Is the account that signed this write the one signed in right now? A write
  // for account A must never be sent with account B's session.
  async function ownsSession(): Promise<boolean> {
    try {
      const { data } = await client.auth.getSession();
      return data.session?.user.id === userId;
    } catch {
      return false;
    }
  }

  // Waits for the answer, giving up after REQUEST_TIMEOUT_MS. A refusal becomes
  // a RemoteFailure, a request that never got an answer has status 0. The timer
  // is cleared as soon as the request ends, so none outlives it.
  async function answer(query: Query): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    let reply: Reply;
    try {
      reply = await query.abortSignal(controller.signal);
    } finally {
      clearTimeout(timer);
    }
    if (reply.error) {
      throw new RemoteFailure(
        reply.error.message,
        reply.status,
        reply.error.code ?? '',
      );
    }
    return reply.data;
  }

  async function upsert(table: string, rows: Row | Row[], how: UpsertOptions) {
    await answer(client.from(table).upsert(rows, how));
  }

  // Reads every row of the user's in one table, a page at a time, in a stable
  // order. Too many rows is an error, never a silently short list.
  async function readAll(table: string, columns: string, order: string) {
    const rows: unknown[] = [];
    for (let page = 0; page < maxPages; page += 1) {
      const from = page * PAGE_SIZE;
      const data = await answer(
        client
          .from(table)
          .select(columns)
          .eq('user_id', userId)
          .order(order)
          .range(from, from + PAGE_SIZE - 1),
      );
      const got = Array.isArray(data) ? (data as unknown[]) : [];
      rows.push(...got);
      if (got.length < PAGE_SIZE) return rows;
    }
    throw new RemoteFailure(
      `more than ${String(maxPages * PAGE_SIZE)} rows in ${table}`,
      0,
      'NETSTEPS_TOO_MANY_ROWS',
    );
  }

  const readAttempts = () => readAll('quiz_attempts', ATTEMPT_COLUMNS, 'id');

  // Sends rows in requests of CHUNK_SIZE. If a request is refused for good, its
  // rows are sent one at a time so only the truly bad row is given up on. A row
  // that fails for a retryable reason stops everything (the whole write is queued
  // and replayed later, which is safe because every request is an upsert).
  async function upsertRows(
    table: string,
    rows: Row[],
    how: UpsertOptions,
    report: { dropped(count: number): void },
  ) {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      try {
        await upsert(table, chunk, how);
      } catch (error) {
        if ((await judgeFailure(error, ownsSession)) === 'retry') throw error;
        if (chunk.length === 1) {
          report.dropped(1);
          continue;
        }
        for (const row of chunk) {
          try {
            await upsert(table, row, how);
          } catch (single) {
            if ((await judgeFailure(single, ownsSession)) === 'retry')
              throw single;
            report.dropped(1);
          }
        }
      }
    }
  }

  async function executeAll(
    op: Extract<PendingOp, { kind: 'all' }>,
    report: { dropped(count: number): void },
  ) {
    const lessons = Object.entries(op.state.lessons).map(([id, record]) =>
      lessonRow(userId, id, record),
    );
    const labs = Object.entries(op.state.labs).map(([id, record]) =>
      labRow(userId, id, record),
    );
    await upsertRows(
      'lesson_progress',
      lessons,
      { onConflict: 'user_id,lesson_id' },
      report,
    );
    await upsertRows(
      'lab_progress',
      labs,
      { onConflict: 'user_id,lab_id' },
      report,
    );

    // Only now read what the account already has, and add an attempt only where
    // the merged score is strictly better.
    const held = bestsFromAttempts(await readAttempts());
    const attempts: Row[] = [];
    for (const [lessonId, record] of Object.entries(op.state.lessons)) {
      const best = record.quizBest;
      if (best === undefined) continue;
      if (
        submitQuiz(
          held,
          lessonId,
          best.score,
          best.total,
          record.lastOpenedAt,
        ) === held
      ) {
        continue;
      }
      attempts.push({
        // The same score always gets the same id (attemptId.ts), so two tabs
        // merging the same guest progress insert one row between them.
        id: mergeAttemptId(userId, lessonId, best.score, best.total),
        user_id: userId,
        lesson_id: lessonId,
        score: best.score,
        total: best.total,
      });
    }
    await upsertRows(
      'quiz_attempts',
      attempts,
      { onConflict: 'id', ignoreDuplicates: true },
      report,
    );
  }

  async function execute(
    op: PendingOp,
    report: { dropped(count: number): void },
  ) {
    switch (op.kind) {
      case 'lesson':
        return upsert('lesson_progress', lessonRow(userId, op.id, op.record), {
          onConflict: 'user_id,lesson_id',
        });
      case 'lab':
        return upsert('lab_progress', labRow(userId, op.id, op.record), {
          onConflict: 'user_id,lab_id',
        });
      case 'quiz':
        // One row per submit. The id was made when the write was queued, and the
        // insert does nothing if that id is already there: a replay of a write
        // whose first try did reach the server never adds a second attempt.
        return upsert(
          'quiz_attempts',
          {
            id: op.attemptId,
            user_id: userId,
            lesson_id: op.lessonId,
            score: op.score,
            total: op.total,
            created_at: op.at,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      case 'all':
        return executeAll(op, report);
    }
  }

  const queue = createPendingQueue({
    key: pendingKey(userId),
    execute,
    canWrite: ownsSession,
  });

  const queued = async (op: WriteOp): Promise<void> => {
    await queue.enqueue(op);
  };

  return {
    async load() {
      const [lessons, labs, attempts] = await Promise.all([
        readAll('lesson_progress', LESSON_COLUMNS, 'lesson_id'),
        readAll('lab_progress', LAB_COLUMNS, 'lab_id'),
        readAttempts(),
      ]);
      return queue.overlay(progressFromRows({ lessons, labs, attempts }));
    },

    saveLesson: (id, record) => queued({ kind: 'lesson', id, record }),

    saveLab: (id, record) => queued({ kind: 'lab', id, record }),

    async recordQuizAttempt(id, score, total, at) {
      // A result the table would refuse is never queued, so it cannot clog it.
      if (!isValidQuiz({ score, total }) || !isValidTimestamp(at)) return;
      await queued({
        kind: 'quiz',
        attemptId: newId(),
        lessonId: id,
        score,
        total,
        at,
      });
    },

    async saveAll(state) {
      const outcome = await queue.enqueue({
        kind: 'all',
        state: parseProgress(state),
      });
      if (outcome === 'unsaved') {
        throw new Error(
          'Progress could not be sent, and could not be kept for later.',
        );
      }
    },

    flush: () => queue.flush(),
    syncError: () => queue.syncError(),
    droppedCount: () => queue.droppedCount(),
    subscribe: (listener) => queue.subscribe(listener),
  };
}
