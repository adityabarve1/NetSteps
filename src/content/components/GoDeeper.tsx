import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './GoDeeper.module.css';

type GoDeeperProps = { title: string; children: ReactNode };

// A collapsed block for technical depth, so beginners can skip it. It is a
// button with aria-expanded (not <details>) so Enter and Space work the same
// everywhere and the open or closed state is announced.
export function GoDeeper({ title, children }: GoDeeperProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className={styles.block}>
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((wasOpen) => !wasOpen);
          }}
        >
          <span className={styles.label}>Go deeper:</span>{' '}
          <span className={styles.title}>{title}</span>
          <span className={styles.chevron} aria-hidden="true" />
        </button>
      </h3>
      <div id={bodyId} className={styles.body} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
