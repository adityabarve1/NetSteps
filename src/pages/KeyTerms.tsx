import { useEffect, useId, useRef, useState } from 'react';
import { glossary } from '@/content/glossary';
import { lookupTerm } from '@/content/glossary/lookup';
import styles from '@/pages/KeyTerms.module.css';

// True while the element's content is taller than the element, so a keyboard
// user needs a tab stop to scroll it. Only the wide-screen rail ever scrolls.
function useScrolls(ref: React.RefObject<HTMLElement | null>): boolean {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (node === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setScrolls(node.scrollHeight > node.clientHeight);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return scrolls;
}

// The lesson's glossary terms as a list to review: a sticky rail on wide
// screens, a normal block at the end of the lesson on narrow ones. Plain text
// only; the Term popovers keep their own behaviour. Unknown ids are skipped.
export function KeyTerms({
  ids,
  className,
}: {
  ids: string[];
  className?: string;
}) {
  const headingId = useId();
  const scroller = useRef<HTMLElement>(null);
  const scrolls = useScrolls(scroller);

  const entries = ids.flatMap((id) => {
    const entry = lookupTerm(glossary, id);
    return entry === undefined ? [] : [{ id, entry }];
  });
  if (entries.length === 0) return null;

  return (
    <aside
      ref={scroller}
      className={[styles.rail, className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
      // A scrolling area must be reachable by keyboard (WCAG 2.1.1); the stop
      // only exists while the rail really overflows.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable scroll container, only while it overflows
      tabIndex={scrolls ? 0 : undefined}
    >
      <h2 id={headingId} className={styles.title}>
        Key terms
      </h2>
      <dl className={styles.list}>
        {entries.map(({ id, entry }) => (
          <div key={id} className={styles.item}>
            <dt className={styles.term}>{entry.term}</dt>
            <dd className={styles.definition}>{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
