// Sends the writes an action called for to a store, in order, without waiting.
import type { ProgressWrite } from '@/progress/actions';
import type { ProgressStore } from '@/progress/store';

function send(store: ProgressStore, write: ProgressWrite): Promise<void> {
  switch (write.kind) {
    case 'lesson':
      return store.saveLesson(write.id, write.record);
    case 'quiz':
      return store.recordQuizAttempt(
        write.id,
        write.score,
        write.total,
        write.at,
      );
    case 'lab':
      return store.saveLab(write.id, write.record);
  }
}

/**
 * The stores keep their own failures (a refused write is queued or held in
 * memory), so nothing is expected to come back here. This is the last line of
 * defence: a store that throws or rejects must never become an unhandled
 * rejection or break the page.
 */
export function sendWrites(
  store: ProgressStore,
  writes: readonly ProgressWrite[],
): void {
  for (const write of writes) {
    try {
      send(store, write).catch(() => undefined);
    } catch {
      // A store that throws instead of returning a promise: same rule.
    }
  }
}
