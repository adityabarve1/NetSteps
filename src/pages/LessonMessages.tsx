import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import styles from '@/pages/LessonPage.module.css';
import { useDocumentTitle } from '@/pages/useDocumentTitle';

export function LessonNotFound() {
  useDocumentTitle('Lesson not found');
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

// `takeFocus` is true for a retry only: the "Try again" button the learner just
// pressed is gone, so focus goes to this status instead of dropping to the page.
// The first load never takes focus, the route change already handled that.
export function LessonLoading({ takeFocus = false }: { takeFocus?: boolean }) {
  useDocumentTitle('Loading the lesson');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (takeFocus) ref.current?.focus({ preventScroll: true });
  }, [takeFocus]);
  return (
    <div
      ref={ref}
      className={styles.message}
      role="status"
      aria-busy="true"
      tabIndex={-1}
    >
      Loading the lesson...
    </div>
  );
}

// role="alert" makes a screen reader announce the failure as soon as it shows.
export function LessonLoadFailed({ onRetry }: { onRetry: () => void }) {
  useDocumentTitle('Could not load the lesson');
  return (
    <div className={styles.message} role="alert">
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
