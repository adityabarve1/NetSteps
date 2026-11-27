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
// reach the screen. If localStorage will not take a write it is kept in memory
// (and `enqueue` says so, see EnqueueOutcome).
//
// TABS. Every write has its OWN localStorage key, `<key>.<seq>`, so two tabs of
// one account never overwrite each other's writes by saving whole queues. The queue
// is read from storage when it is created, so writes a closed tab left behind are
// replayed by the next store. A tab CANNOT tell whether the tab that made a key is
// still open, so it may pick up the keys of live tabs, and two live tabs can then
// both fold writes into one key. Hence the rules for touching a key that exists:
//   * REWRITING (a fold) is a read-modify-write: re-read the stored value, check it
//     is a valid write for the same row, JOIN it with this tab's copy (the join
//     only ever adds: completed beats in progress and so on), write the join, and
//     keep the join as this tab's copy. A value that is gone, corrupt, or for another
//     row or kind is not joined: this tab's write becomes a NEW key instead.
//   * ADDING a write never overwrites: a key that already exists gets a new seq.
//   * REMOVING a key (after the write was sent, or given up on) happens only if
//     the key still holds what this tab last saw there, or something the send fully
//     covers. If another tab folded a newer write into it meanwhile, the key stays;
//     it is that write's to send, on the next flush of the tab that holds it or the
//     next store that reads it.
// Replays are idempotent, so two tabs sending the same write do no harm.
import {
  appendOp,
  bySeq,
  covers,
  joinOps,
  opKey,
  overlayOps,
  parseStoredOp,
  seqOfKey,
  serializeOp,
} from '@/progress/pendingOps';
import type { PendingOp, WriteOp } from '@/progress/pendingOps';
import { judgeFailure } from '@/progress/remoteFailure';
import { listKeys, readItem, removeItem, writeItem } from '@/progress/storage';
import type { ProgressState } from '@/progress/types';

/**
 * Where an `enqueue`d write ended up when the call returned:
 *   done     sent, or given up on because the database can never accept it
 *   queued   still waiting, and saved in localStorage
 *   unsaved  still waiting, but ONLY in memory (storage refused it)
 */
export type EnqueueOutcome = 'done' | 'queued' | 'unsaved';

export interface PendingQueueOptions {
  /** localStorage key prefix, `netsteps.pending.<userId>`; each write is `<key>.<seq>`. */
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
  // The last value this tab saw under each write's key (to remove a key only if
  // nobody changed it), and the writes whose newest version is NOT in storage.
  const seen = new Map<string, string>();
  const unsaved = new Set<string>();

  // Read every write left in storage, once. Anything unreadable is skipped and
  // left exactly where it is; so is the old single key and every other account's.
  const loaded: PendingOp[] = [];
  for (const storageKey of listKeys()) {
    const seq = seqOfKey(key, storageKey);
    if (seq === null) continue;
    const raw = readItem(storageKey);
    const op = parseStoredOp(seq, raw);
    if (op !== undefined && raw !== null) {
      loaded.push(op);
      seen.set(seq, raw);
    }
  }
  let ops: PendingOp[] = loaded.sort(bySeq);

  // New seqs never go backwards, and continue after the ones picked up above, so
  // a write made now sorts after every write already waiting.
  let lastTime = 0;
  let counter = 0;
  for (const op of ops) {
    lastTime = Math.max(lastTime, Number(op.seq.slice(0, 15)));
    counter = Math.max(counter, Number(op.seq.slice(16, 22)));
  }
  const newSeq = (): string => {
    lastTime = Math.max(Date.now(), lastTime);
    counter += 1;
    const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
    return `${String(lastTime).padStart(15, '0')}-${String(counter).padStart(6, '0')}-${suffix}`;
  };

  let dropped = 0;
  let failing = false;
  let inFlight: string | null = null;
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

  // Writes (or rewrites) one op's key. False means storage refused it.
  const save = (op: PendingOp): boolean => {
    const raw = serializeOp(op);
    if (writeItem(opKey(key, op.seq), raw)) {
      seen.set(op.seq, raw);
      unsaved.delete(op.seq);
      return true;
    }
    unsaved.add(op.seq);
    return false;
  };

  // This tab is done with an op (it was sent, or given up on). Its key goes only
  // if it still holds what this tab saw there, or something `sent` fully covers.
  // If another tab changed it meanwhile, the key stays: that is their write to send.
  const forget = (seq: string, sent?: PendingOp): void => {
    const expected = seen.get(seq);
    seen.delete(seq);
    unsaved.delete(seq);
    if (expected === undefined) return;
    const now = readItem(opKey(key, seq));
    if (now === null) return;
    const stored = parseStoredOp(seq, now);
    const unchanged = now === expected;
    const covered =
      sent !== undefined && stored !== undefined && covers(sent, stored);
    if (unchanged || covered) removeItem(opKey(key, seq));
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
        forget(head.seq, head);
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

  // Saves a write under a seq nobody is using: a key that exists is never
  // overwritten (two tabs could, very rarely, make the same seq). Returns the write
  // as it is now saved (with its seq changed if it had to be).
  const addNew = (op: PendingOp): PendingOp => {
    let added = op;
    for (let tries = 0; tries < 10; tries += 1) {
      if (readItem(opKey(key, added.seq)) === null) break;
      added = { ...added, seq: newSeq() };
    }
    save(added);
    return added;
  };

  // A write was folded into the earlier write `op` (same seq). Re-read what is
  // stored under its key and join it with `op`; the join is what gets written, and
  // it replaces this tab's copy. If nothing joinable is stored (the key is gone, or
  // holds something corrupt, or a write for another row or kind), the write goes
  // to a NEW key instead and the old key is left as it is.
  const rewrite = (op: PendingOp): PendingOp => {
    if (!seen.has(op.seq)) return addNew(op); // never saved: nothing to join
    const stored = parseStoredOp(op.seq, readItem(opKey(key, op.seq)));
    const joined = stored === undefined ? undefined : joinOps(stored, op);
    if (joined === undefined) {
      forget(op.seq);
      return addNew({ ...op, seq: newSeq() });
    }
    save(joined);
    return joined;
  };

  // Makes storage match the change `appendOp` made to the queue. Returns the seq
  // of the write that now carries the new one.
  function store(before: readonly PendingOp[], held: string): string {
    const kept = new Set(ops.map((op) => op.seq));
    for (const old of before) {
      if (!kept.has(old.seq)) forget(old.seq); // dropped to stay under the cap
    }
    const was = new Set(before);
    for (const op of [...ops]) {
      if (was.has(op)) continue;
      const foldedIntoEarlier = before.some((old) => old.seq === op.seq);
      const saved = foldedIntoEarlier ? rewrite(op) : addNew(op);
      if (saved === op) continue;
      // The copy this tab holds becomes what was actually saved. A write moved to a
      // new key goes to the end of the queue (writes for other rows do not care).
      ops =
        saved.seq === op.seq
          ? ops.map((entry) => (entry === op ? saved : entry))
          : [...ops.filter((entry) => entry !== op), saved];
      if (held === op.seq) held = saved.seq;
    }
    return held;
  }

  return {
    enqueue(op) {
      const before = ops;
      const added = appendOp(before, op, newSeq(), inFlight);
      ops = added.queue;
      dropped += added.dropped;
      const held = store(before, added.held);
      const sending = flush();
      return sending.then(() => {
        if (!ops.some((entry) => entry.seq === held)) return 'done';
        return unsaved.has(held) ? 'unsaved' : 'queued';
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
