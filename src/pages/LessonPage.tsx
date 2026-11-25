import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { findLesson } from '@/content/curriculum';
import { loadLesson } from '@/content/loaders';
import type { Lesson, LessonMeta } from '@/content/types';
import { LessonErrorBoundary } from '@/pages/LessonErrorBoundary';
import {
  LessonLoadFailed,
  LessonLoading,
  LessonNotFound,
} from '@/pages/LessonMessages';
import { LessonView } from '@/pages/LessonView';

// Loads one built lesson. `attempt` counts tries: a result belongs to the try
// that produced it, so "still loading" is derived (no result for this try yet)
// and nothing sets state synchronously in an effect. The cancel flag stops a
// slow earlier load from showing, and the parent keys this by lesson id, so a
// lesson that loads late can never replace the one now on screen.
function LessonLoader({ meta }: { meta: LessonMeta }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    lesson: Lesson | undefined;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLesson(meta.id).then((lesson) => {
      if (!cancelled) setResult({ attempt, lesson });
    });
    return () => {
      cancelled = true;
    };
  }, [meta.id, attempt]);

  if (result?.attempt !== attempt) return <LessonLoading />;

  // loadLesson answers undefined for a failed download. A lesson of another id
  // is treated the same way, so progress is never written for the wrong lesson.
  if (result.lesson?.id !== meta.id) {
    return (
      <LessonLoadFailed
        onRetry={() => {
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  return (
    <LessonErrorBoundary>
      <LessonView lesson={result.lesson} meta={meta} />
    </LessonErrorBoundary>
  );
}

// Route /learn/:levelId/:lessonId. An unknown lesson, an unbuilt one, or a
// lesson under the wrong level is "not found" and touches no progress.
export default function LessonPage() {
  const { levelId = '', lessonId = '' } = useParams();
  const meta = findLesson(levelId, lessonId);
  if (meta?.built !== true) return <LessonNotFound />;
  return <LessonLoader key={meta.id} meta={meta} />;
}
