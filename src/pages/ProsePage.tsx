import type { ReactNode } from 'react';
import styles from '@/pages/ProsePage.module.css';

// The readable column for pages that are mostly running text.
export function ProsePage({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}
