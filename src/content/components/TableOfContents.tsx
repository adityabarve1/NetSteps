import { useId } from 'react';
import styles from './TableOfContents.module.css';

type TableOfContentsProps = {
  sections: { id: string; title: string }[];
  // The section being read, if the page tracks it.
  activeId?: string;
};

// Anchor links to each section of a lesson. On a phone it is one compact row
// that scrolls sideways inside itself; on a wide screen it is a plain list.
export function TableOfContents({ sections, activeId }: TableOfContentsProps) {
  const labelId = useId();
  if (sections.length === 0) return null;
  return (
    <nav aria-labelledby={labelId} className={styles.toc}>
      <p id={labelId} className={styles.label}>
        In this lesson
      </p>
      <ol className={styles.list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              className={styles.link}
              href={`#${section.id}`}
              aria-current={section.id === activeId ? 'true' : undefined}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
