import { createContext, useContext } from 'react';
import type { LessonId, ProgressState } from '@/progress/types';

export interface ProgressContextValue {
  /** Empty until `ready`, and empty again the moment the learner changes. */
  state: ProgressState;
  /** True once the identity is known AND that learner's progress has loaded. */
  ready: boolean;
  /** True while saved-for-later writes that failed are waiting to be retried. */
  syncError: boolean;
  /**
   * How many writes were given up on because the database can never accept them.
   * Not an alarm: a learner is not told. Exposed so a page can offer a hint.
   */
  droppedCount: number;
  openLesson(id: LessonId): void;
  submitQuiz(id: LessonId, score: number, total: number): void;
  completeLesson(id: LessonId): void;
  startLab(id: string): void;
  completeLab(id: string): void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error('useProgress must be used inside <ProgressProvider>');
  }
  return value;
}
