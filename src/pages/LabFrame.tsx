import { useCallback, useId, useRef } from 'react';
import type { LabDefinition } from '@/content/types';
import styles from '@/pages/LessonPage.module.css';
import { useProgress } from '@/progress/useProgress';

// Wraps one lab of a lesson. It records progress for the lab and nothing else:
// labs never decide whether the lesson is complete.
//   - startLab(labId): once, on the first pointer press or key press inside the
//     frame (captured, so it sees them before the lab does). Hovering, tabbing
//     past or scrolling to the lab is not "starting" it.
//   - completeLab(labId): once, when the lab calls onDone, even if it calls it
//     twice and even if the learner never pressed anything first. Completing
//     implies it was started, so no separate startLab call is made.
// Keys that only move around or modify other keys. Pressing one is not "using"
// the lab, so tabbing through a lab never counts as starting it.
const IGNORED_KEYS = new Set([
  'Tab',
  'Shift',
  'Alt',
  'AltGraph',
  'Control',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Fn',
  'FnLock',
  'OS',
  'Dead',
  'Unidentified',
]);

export function LabFrame({ lab }: { lab: LabDefinition }) {
  const progress = useProgress();
  const titleId = useId();
  const started = useRef(false);
  const done = useRef(false);
  const { id } = lab;

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    progress.startLab(id);
  }, [id, progress]);

  const onDone = useCallback(() => {
    if (done.current) return;
    done.current = true;
    started.current = true;
    progress.completeLab(id);
  }, [id, progress]);

  return (
    <div
      className={styles.card}
      role="group"
      aria-labelledby={titleId}
      onPointerDownCapture={start}
      onKeyDownCapture={(event) => {
        if (!IGNORED_KEYS.has(event.key)) start();
      }}
    >
      <h3 id={titleId} className={styles.cardTitle}>
        {lab.title}
      </h3>
      <LabBody lab={lab} onDone={onDone} />
    </div>
  );
}

// The lab is drawn by its own component so `onDone` reaches it as a prop. Handing
// a function that touches refs straight to lab.render during this component's
// render would break the rule against reading refs while rendering.
function LabBody({ lab, onDone }: { lab: LabDefinition; onDone: () => void }) {
  return lab.render({ onDone });
}
