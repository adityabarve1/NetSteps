// Guest progress, kept in this browser. Stored as `{ v: 1, state }` under one key.
//
// Rules (RF2): reading never throws and never writes. A damaged, unfamiliar or
// unreadable blob loads as "nothing saved" and is left exactly as it was; only an
// explicit save replaces it. When the browser refuses a write (quota, private
// window) the learner's progress is kept in memory and `load()` returns it for the
// rest of the session.
//
// Every save is a JOIN (mergeProgress), never a replacement. A guest has no
// database to protect a completion from a stale write, and two tabs of the same
// browser share this key: a tab that still shows an old "in progress" record must
// not turn a completion made in the other tab back. So a save reads what is stored
// RIGHT NOW (plus anything held in memory after a refused write), joins the new
// record into it (completed beats in progress, the best quiz score stays, the
// earliest completion time stays) and writes the result, all in one synchronous
// step, so two saves started back to back cannot overwrite each other either.
import { emptyProgress, mergeProgress } from '@/progress/logic';
import { parseProgress } from '@/progress/parse';
import { readItem, removeItem, writeItem } from '@/progress/storage';
import type { LocalStore } from '@/progress/store';
import type { ProgressState } from '@/progress/types';

export const GUEST_STORAGE_KEY = 'netsteps.progress.guest.v1';
const FORMAT_VERSION = 1;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readState(raw: string | null): ProgressState {
  if (raw === null) return emptyProgress();
  try {
    const envelope: unknown = JSON.parse(raw);
    if (isObject(envelope) && envelope.v === FORMAT_VERSION) {
      return parseProgress(envelope.state);
    }
  } catch {
    // Not JSON: treated like any other unreadable blob.
  }
  return emptyProgress();
}

export function createLocalStore(key: string = GUEST_STORAGE_KEY): LocalStore {
  // Set only while the last write was refused: the newest full state.
  let unsaved: ProgressState | null = null;

  // What is stored now, joined with what could not be stored (so a later save, or
  // a load, sees both and one never hides the other).
  const current = (): ProgressState => {
    const stored = readState(readItem(key));
    return unsaved === null ? stored : mergeProgress(stored, unsaved);
  };

  const write = (state: ProgressState): void => {
    const stored = writeItem(key, JSON.stringify({ v: FORMAT_VERSION, state }));
    unsaved = stored ? null : state;
  };

  return {
    load: () => Promise.resolve(current()),

    saveLesson(id, record) {
      write(mergeProgress(current(), { lessons: { [id]: record }, labs: {} }));
      return Promise.resolve();
    },

    // The best score is part of the lesson record, which saveLesson stores.
    recordQuizAttempt: () => Promise.resolve(),

    saveLab(id, record) {
      write(mergeProgress(current(), { lessons: {}, labs: { [id]: record } }));
      return Promise.resolve();
    },

    saveAll(state) {
      write(mergeProgress(current(), parseProgress(state)));
      return Promise.resolve();
    },

    clear() {
      unsaved = null;
      removeItem(key);
    },
  };
}
