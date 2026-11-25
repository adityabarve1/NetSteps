import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson } from '@/content/types';
import type { LessonRun } from '@/pages/lessonRun';
import { canComplete } from '@/progress/logic';
import type { QuizBest } from '@/progress/types';
import { useProgress } from '@/progress/useProgress';

export type LessonTracking = {
  run: LessonRun;
  onQuizSubmit: (score: number, total: number) => void;
  previousBest: QuizBest | undefined;
};

// Ties one opened lesson to the progress layer (spec section 10).
//   - openLesson: once per mount. A ref remembers it, and a ref survives
//     StrictMode's extra mount-unmount-mount of effects.
//   - submitQuiz: on every submit (the progress layer keeps one row per attempt).
//   - completeLesson: once, when the primary simulation reached its last step
//     AND the quiz was submitted (any score), in either order, and only if the
//     lesson is not already completed (a revisit must not rewrite completion).
//     It waits until progress has loaded, so "already completed" is known.
// Nothing here runs on scroll, hover or an ordinary click.
export function useLessonTracking(lesson: Lesson): LessonTracking {
  // Not destructured: the progress functions are methods of one object.
  const progress = useProgress();
  const { state, ready } = progress;
  const { id, primarySimulationId } = lesson;
  const [primarySimFinished, setPrimarySimFinished] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const opened = useRef(false);
  const completionHandled = useRef(false);

  const record = Object.hasOwn(state.lessons, id)
    ? state.lessons[id]
    : undefined;
  const alreadyCompleted = record?.status === 'completed';

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    progress.openLesson(id);
  }, [id, progress]);

  useEffect(() => {
    if (!ready || completionHandled.current) return;
    if (!canComplete({ primarySimFinished, quizSubmitted })) return;
    completionHandled.current = true;
    if (!alreadyCompleted) progress.completeLesson(id);
  }, [
    ready,
    primarySimFinished,
    quizSubmitted,
    alreadyCompleted,
    progress,
    id,
  ]);

  const markSimFinished = useCallback(
    (simId: string) => {
      if (simId === primarySimulationId) setPrimarySimFinished(true);
    },
    [primarySimulationId],
  );

  const onQuizSubmit = useCallback(
    (score: number, total: number) => {
      progress.submitQuiz(id, score, total);
      setQuizSubmitted(true);
    },
    [id, progress],
  );

  return {
    run: { markSimFinished },
    onQuizSubmit,
    previousBest: record?.quizBest,
  };
}
