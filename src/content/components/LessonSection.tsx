import type { ReactNode } from 'react';
import styles from './LessonSection.module.css';

type LessonSectionProps = {
  // Becomes the anchor the table of contents links to (kebab-case).
  id: string;
  title: string;
  children: ReactNode;
};

// One titled part of a lesson's "Learn" area.
export function LessonSection({ id, title, children }: LessonSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}
