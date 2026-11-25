import { Link } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { curriculum } from '@/content/curriculum';
import type { LevelMeta } from '@/content/types';
import styles from '@/pages/CourseMap.module.css';
import { LevelSection } from '@/pages/LevelSection';
import { continueTarget, overallProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { useProgress } from '@/progress/useProgress';

function findLesson(levels: LevelMeta[], id: string) {
  for (const level of levels) {
    const index = level.lessons.findIndex((l) => l.id === id);
    const lesson = level.lessons[index];
    if (lesson !== undefined) return { level, lesson, number: index + 1 };
  }
  return null;
}

// True when the learner has a record for any lesson in this course. Records for
// other ids are ignored, as everywhere else.
function hasAnyRecord(state: ProgressState, levels: LevelMeta[]): boolean {
  return levels.some((level) =>
    level.lessons.some((l) => Object.hasOwn(state.lessons, l.id)),
  );
}

// The main call to action, or a short honest note when there is nothing to open.
function NextStep({ levels }: { levels: LevelMeta[] }) {
  const { state } = useProgress();
  const hasBuilt = levels.some((l) => l.lessons.some((x) => x.built));
  if (!hasBuilt) {
    return (
      <p className={styles.note}>Lessons are being written. Check back soon.</p>
    );
  }

  const id = continueTarget(state, levels);
  const target = id === null ? null : findLesson(levels, id);
  if (target === null) {
    return (
      <p className={styles.note}>
        You are all caught up. More lessons are on the way.
      </p>
    );
  }

  const returning = hasAnyRecord(state, levels);
  const hasRecord = Object.hasOwn(state.lessons, target.lesson.id);
  const label = !returning
    ? `Start Lesson ${String(target.number)}`
    : hasRecord
      ? 'Continue where you left off'
      : 'Start next lesson';

  return (
    <Link
      className={styles.cta}
      to={`/learn/${target.level.id}/${target.lesson.id}`}
    >
      <span className={styles.ctaLabel}>{label}</span>
      <span className={styles.ctaLesson}>{target.lesson.title}</span>
    </Link>
  );
}

function GuestNote() {
  const { status } = useAuth();
  if (status !== 'signed-out' && status !== 'unconfigured') return null;
  return (
    <p className={styles.note}>
      Your progress is saved on this device. <Link to="/login">Sign in</Link> to
      keep it everywhere.
    </p>
  );
}

// The default export is the route's page (lazy-loaded). `levels` is a prop so
// tests can show a course with built lessons; the route uses the real one.
export default function CourseMap({
  levels = curriculum,
}: {
  levels?: LevelMeta[];
}) {
  const { state, ready, syncError } = useProgress();
  const { done, total } = overallProgress(state, levels);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Course map</h1>
      <p className={styles.intro}>
        Seven levels, from the very basics to advanced topics. Take them in
        order, or jump to any lesson that is ready.
      </p>
      {ready && total > 0 && (
        <p className={styles.summary}>
          {`${String(done)} of ${String(total)} ${total === 1 ? 'lesson' : 'lessons'} done`}
        </p>
      )}
      {ready ? (
        <NextStep levels={levels} />
      ) : (
        <p className={styles.note}>Loading your progress</p>
      )}
      <GuestNote />
      <div role="status" className={styles.sync}>
        {syncError &&
          'We will finish saving your progress when you are back online.'}
      </div>
      {levels.map((level) => (
        <LevelSection
          key={level.id}
          level={level}
          state={state}
          ready={ready}
        />
      ))}
    </div>
  );
}
