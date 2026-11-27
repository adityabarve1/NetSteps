import { Component } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from '@/pages/LessonPage.module.css';
import { useDocumentTitle } from '@/pages/useDocumentTitle';

type Props = { children: ReactNode };

// A lesson is content written by us. If one throws while rendering, the learner
// sees this message instead of a blank page or the router's error screen. A
// lesson that crashes on its first render never ran its effects, so it recorded
// no progress at all. One that crashes later keeps whatever it had already
// recorded (progress writes happen once, in effects and event handlers, never
// in render), and nothing more is written. There is no error service to report to, and `console` is
// not allowed in src, so the message is the whole response.
function CrashMessage() {
  useDocumentTitle('Something went wrong');
  return (
    <div className={styles.message} role="alert">
      <h1 className={styles.messageTitle}>Something went wrong</h1>
      <p>Something went wrong in this lesson. Your progress is safe.</p>
      <Link className={styles.button} to="/learn">
        Back to the course map
      </Link>
    </div>
  );
}

export class LessonErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <CrashMessage />;
  }
}
