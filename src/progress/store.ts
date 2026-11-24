// The one interface the app talks to, whether progress lives in this browser
// (guests) or in Supabase (signed-in learners). Types only.
import type {
  LabRecord,
  LessonId,
  LessonRecord,
  ProgressState,
} from '@/progress/types';

export interface ProgressStore {
  /**
   * Everything saved for this learner, already through `parseProgress`. The local
   * store never rejects. The account store rejects when the remote read fails, so
   * a caller can tell "nothing saved yet" from "could not read".
   */
  load(): Promise<ProgressState>;
  /** Saves one lesson's status and times (not its quiz score; see below). */
  saveLesson(id: LessonId, record: LessonRecord): Promise<void>;
  /**
   * One quiz submit. The account store writes one `quiz_attempts` row; the local
   * store writes nothing, because the best score travels in the lesson record.
   */
  recordQuizAttempt(
    id: LessonId,
    score: number,
    total: number,
    at: string,
  ): Promise<void>;
  saveLab(id: string, record: LabRecord): Promise<void>;
  /**
   * Saves a whole state (the guest-to-account merge). Resolves once the work is
   * either done or safely kept for later; rejects only if it is neither.
   */
  saveAll(state: ProgressState): Promise<void>;
}

/** The guest store. `clear` forgets the guest's progress (after a merge). */
export interface LocalStore extends ProgressStore {
  clear(): void;
}

/** The signed-in store: writes go through an offline queue. */
export interface AccountStore extends ProgressStore {
  /** Replays queued writes in order. Never rejects; waits for a replay already running. */
  flush(): Promise<void>;
  /** True while queued writes that failed for a reason worth retrying are waiting. */
  syncError(): boolean;
  /** How many writes were given up on because the database can never accept them. */
  droppedCount(): number;
  /** Called after the queue changes. Returns the function that stops listening. */
  subscribe(listener: () => void): () => void;
}

export interface StoreFactory {
  guest(): LocalStore;
  account(userId: string): AccountStore;
}
