// The offline queue (RF3). Every write to Supabase goes through here:
//
//   1. the write is added to the queue and saved to localStorage FIRST, so it
//      survives a closed tab;
//   2. the queue is replayed in order; a write leaves the queue only after the
//      server accepted it (or can never accept it, see classifyFailure);
//   3. the first failure worth retrying stops the replay and keeps the rest;
//   4. only one replay runs at a time, and callers that ask during one wait for it.
//
// Nothing here ever rejects, so no failure can become an unhandled rejection or
// reach the screen. If localStorage will not take the queue it is kept in memory
// (and `enqueue` says so, see EnqueueOutcome).
import {
  appendOp,
  overlayOps,
  parsePending,
  serializePending,
} from '@/progress/pendingOps';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { judgeFailure } from '@/progress/remoteFailure';
import { readItem, removeItem, writeItem } from '@/progress/storage';
import type { ProgressState } from '@/progress/types';

/**
 * Where an `enqueue`d write ended up when the call returned:
 *   done     sent, or given up on because the database can never accept it
 *   queued   still waiting, and saved in localStorage
 *   unsaved  still waiting, but ONLY in memory (storage refused it)
 */
export type EnqueueOutcome = 'done' | 'queued' | 'unsaved';

export interface PendingQueueOptions {
  /** localStorage key, `netsteps.pending.<userId>`. */
  key: string;
  /** Sends one write. Throws when it fails. `report.dropped` counts rows it gave up on inside the write. */
  execute: (
    op: PendingOp,
    report: { dropped: (count: number) => void },
  ) => Promise<void>;
  /** False while a different account (or nobody) is signed in: nothing is sent then. */
  canWrite?: () => Promise<boolean>;
}

export interface PendingQueue {
  enqueue(op: WriteOp): Promise<EnqueueOutcome>;
  flush(): Promise<void>;
  overlay(state: ProgressState): ProgressState;
  pending(): readonly PendingOp[];
  size(): number;
  /** Writes that failed for a retryable reason are waiting. */
  syncError(): boolean;
  droppedCount(): number;
  subscribe(listener: () => void): () => void;
}

export function createPendingQueue(options: PendingQueueOptions): PendingQueue {
  const { key, execute, canWrite } = options;
  let ops: PendingOp[] = parsePending(readItem(key));
  let nextSeq = ops.reduce((highest, op) => Math.max(highest, op.seq + 1), 1);
  let kept = true; // what is in storage matches what is in memory
  let dropped = 0;
  let failing = false;
  let inFlight: number | null = null;
  let flushing = false;
  let current: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A broken listener must not break saving progress.
      }
    }
  };

  const persist = () => {
    kept =
      ops.length === 0
        ? removeItem(key)
        : writeItem(key, serializePending(ops));
  };

  // The replay. `flushing` is cleared in the same synchronous step as the last
  // look at the queue, so a write that arrives afterwards starts a new replay
  // instead of being left behind.
  async function replay(): Promise<void> {
    try {
      if (ops.length === 0) return;
      if (canWrite !== undefined && !(await canWrite())) {
        failing = true;
        return;
      }
      for (;;) {
        const head = ops[0];
        if (head === undefined) {
          failing = false;
          return;
        }
        inFlight = head.seq;
        let verdict: 'ok' | 'retry' | 'drop' = 'ok';
        try {
          await execute(head, {
            dropped: (count) => {
              dropped += count;
            },
          });
        } catch (error) {
          verdict = await judgeFailure(error, canWrite);
        }
        inFlight = null;
        if (verdict === 'retry') {
          failing = true;
          return;
        }
        if (verdict === 'drop') dropped += 1;
        ops = ops.filter((op) => op.seq !== head.seq);
        persist();
        notify();
      }
    } catch {
      failing = true; // nothing we do not understand may escape
    } finally {
      inFlight = null;
      flushing = false;
      notify();
    }
  }

  function flush(): Promise<void> {
    if (flushing) return current;
    flushing = true;
    current = replay();
    return current;
  }

  return {
    enqueue(op) {
      const seq = nextSeq;
      nextSeq += 1;
      const added = appendOp(ops, op, seq, inFlight);
      ops = added.queue;
      dropped += added.dropped;
      persist();
      const sending = flush();
      return sending.then(() => {
        if (!ops.some((entry) => entry.seq === seq)) return 'done';
        return kept ? 'queued' : 'unsaved';
      });
    },
    flush,
    overlay: (state) => overlayOps(state, ops),
    pending: () => ops,
    size: () => ops.length,
    syncError: () => failing && ops.length > 0,
    droppedCount: () => dropped,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
