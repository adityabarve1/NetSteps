import type { LessonRecord, ProgressState } from '@/progress/types';

// Shared builders for the progress tests. Three moments, one day apart.
export const T1 = '2026-03-01T10:00:00.000Z';
export const T2 = '2026-03-02T10:00:00.000Z';
export const T3 = '2026-03-03T10:00:00.000Z';

export const opened = (at: string): LessonRecord => ({
  status: 'in_progress',
  lastOpenedAt: at,
});

export const done = (at: string): LessonRecord => ({
  status: 'completed',
  lastOpenedAt: at,
  completedAt: at,
});

export const withQuiz = (
  record: LessonRecord,
  score: number,
  total: number,
): LessonRecord => ({ ...record, quizBest: { score, total } });

export const stateOf = (lessons: ProgressState['lessons']): ProgressState => ({
  lessons,
  labs: {},
});

export const lessonOf = (
  s: ProgressState,
  id: string,
): LessonRecord | undefined => s.lessons[id];

// Frozen objects throw on any write, so a function that mutates its argument
// fails loudly (ES modules run in strict mode).
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value as Record<string, unknown>)) {
      deepFreeze(inner);
    }
    Object.freeze(value);
  }
  return value;
}
