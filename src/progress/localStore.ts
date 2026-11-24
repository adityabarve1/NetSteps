// Guest progress, kept in this browser. Stored as `{ v: 1, state }` under one key.
//
// Rules (RF2): reading never throws and never writes. A damaged, unfamiliar or
// unreadable blob loads as "nothing saved" and is left exactly as it was; only an
// explicit save replaces it. When the browser refuses a write (quota, private
// window) the learner's progress is kept in memory and `load()` returns it for the
// rest of the session. Each save reads the current state and writes the new one in
// a single synchronous step, so two saves started back to back cannot overwrite
// each other.
import { emptyProgress } from '@/progress/logic';
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

  const current = (): ProgressState => unsaved ?? readState(readItem(key));

  const write = (state: ProgressState): void => {
    const stored = writeItem(key, JSON.stringify({ v: FORMAT_VERSION, state }));
    unsaved = stored ? null : state;
  };

  return {
    load: () => Promise.resolve(current()),

    saveLesson(id, record) {
      const state = current();
      write({ ...state, lessons: { ...state.lessons, [id]: record } });
      return Promise.resolve();
    },

    // The best score is part of the lesson record, which saveLesson stores.
    recordQuizAttempt: () => Promise.resolve(),

    saveLab(id, record) {
      const state = current();
      write({ ...state, labs: { ...state.labs, [id]: record } });
      return Promise.resolve();
    },

    saveAll(state) {
      write(parseProgress(state));
      return Promise.resolve();
    },

    clear() {
      unsaved = null;
      removeItem(key);
    },
  };
}
