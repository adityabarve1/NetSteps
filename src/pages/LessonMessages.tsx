import { Link } from 'react-router';
import styles from '@/pages/LessonPage.module.css';

export function LessonNotFound() {
  return (
    <div className={styles.message}>
      <h1 className={styles.messageTitle}>Lesson not found</h1>
      <p>That lesson is not available yet, or the link is wrong.</p>
      <Link className={styles.button} to="/learn">
        Back to the course map
      </Link>
    </div>
  );
}

export function LessonLoading() {
  return (
    <div className={styles.message} role="status" aria-busy="true">
      Loading the lesson...
    </div>
  );
}

export function LessonLoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.message}>
      <h1 className={styles.messageTitle}>Could not load the lesson</h1>
      <p>We could not load this lesson. Check your connection and try again.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onRetry}>
          Try again
        </button>
        <Link className={styles.button} to="/learn">
          Back to the course map
        </Link>
      </div>
    </div>
  );
}
