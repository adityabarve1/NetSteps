import type { TaskResult } from '@/labs/labTasks';
import { cx } from '@/lib/cx';
import styles from './BuilderLab.module.css';

/** The live goal list. Done is shown by an icon AND a word, never colour alone. */
export function TaskChecklist({ results }: { results: TaskResult[] }) {
  if (results.length === 0) return null;
  const doneCount = results.filter((r) => r.done).length;
  const summary =
    doneCount === results.length
      ? 'All goals done. Nice work!'
      : `${String(doneCount)} of ${String(results.length)} goals done`;
  return (
    <section className={styles.card} aria-labelledby="builder-goals-title">
      <h3 id="builder-goals-title" className={styles.cardTitle}>
        Goals
      </h3>
      <p role="status" className={styles.summary}>
        {summary}
      </p>
      <ul className={styles.goals}>
        {results.map((r) => (
          <li key={r.id} className={cx(styles.goal, r.done && styles.goalDone)}>
            <svg
              className={styles.goalIcon}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="8.5" />
              {r.done ? <path d="M5.5 10.5 8.5 13.5 14.5 7" /> : null}
            </svg>
            <span>{r.description}</span>
            <span className={styles.goalState}>
              {r.done ? 'Done' : 'Not yet'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
