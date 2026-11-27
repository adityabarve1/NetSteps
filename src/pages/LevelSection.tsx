import type { LevelMeta } from '@/content/types';
import styles from '@/pages/CourseMap.module.css';
import { LessonRow } from '@/pages/LessonRow';
import { ProgressRing } from '@/pages/ProgressRing';
import { levelProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';

// Own entries only, so an id like "constructor" is never a record.
function recordOf(state: ProgressState, id: string) {
  return Object.hasOwn(state.lessons, id) ? state.lessons[id] : undefined;
}

function allLabsDone(state: ProgressState, labIds: string[]): boolean {
  return (
    labIds.length > 0 &&
    labIds.every(
      (id) =>
        Object.hasOwn(state.labs, id) && state.labs[id]?.status === 'completed',
    )
  );
}

type Props = { level: LevelMeta; state: ProgressState; ready: boolean };

export function LevelSection({ level, state, ready }: Props) {
  const headingId = `level-${String(level.number)}-title`;
  const hasBuilt = level.lessons.some((l) => l.built);
  const { done, total } = levelProgress(state, level);

  return (
    <section className={styles.level} aria-labelledby={headingId}>
      <header className={styles.levelHeader}>
        <div className={styles.levelText}>
          <h2 id={headingId} className={styles.levelTitle}>
            {`Level ${String(level.number)}: ${level.title}`}
          </h2>
          <p className={styles.levelSummary}>{level.summary}</p>
        </div>
        {!hasBuilt && <span className={styles.soon}>Coming soon</span>}
        {hasBuilt &&
          (ready ? (
            <ProgressRing done={done} total={total} />
          ) : (
            <span className={styles.ringSkeleton} aria-hidden="true" />
          ))}
      </header>
      {ready ? (
        <ul className={styles.rows}>
          {level.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              levelId={level.id}
              lesson={lesson}
              record={recordOf(state, lesson.id)}
              labDone={allLabsDone(state, lesson.labIds)}
              badgeUnbuilt={hasBuilt}
            />
          ))}
        </ul>
      ) : (
        <ul className={styles.rows} aria-busy="true">
          {level.lessons.map((lesson) => (
            <li
              key={lesson.id}
              className={styles.skeletonRow}
              aria-hidden="true"
            />
          ))}
        </ul>
      )}
    </section>
  );
}
