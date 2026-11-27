import { Link } from 'react-router';
import { curriculum } from '@/content/curriculum';
import styles from '@/pages/LessonPage.module.css';
import type { LessonId } from '@/progress/types';

// The next BUILT lesson in course order, across levels. Unbuilt lessons are
// skipped. Undefined after the last built lesson (or for an unknown id).
function nextBuilt(lessonId: LessonId) {
  const all = curriculum.flatMap((level) =>
    level.lessons.map((lesson) => ({ levelId: level.id, lesson })),
  );
  const index = all.findIndex((entry) => entry.lesson.id === lessonId);
  if (index < 0) return undefined;
  return all.slice(index + 1).find((entry) => entry.lesson.built);
}

export function NextLesson({ lessonId }: { lessonId: LessonId }) {
  const next = nextBuilt(lessonId);
  if (next === undefined) {
    return (
      <p className={styles.nextWrap}>
        <Link className={styles.nextLink} to="/learn">
          Back to the course map
        </Link>
      </p>
    );
  }
  return (
    <p className={styles.nextWrap}>
      <Link
        className={styles.nextLink}
        to={`/learn/${next.levelId}/${next.lesson.id}`}
      >
        {`Next: ${next.lesson.title}`}
      </Link>
    </p>
  );
}
