import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { glossary } from '@/content/glossary';
import { lookupTerm } from '@/content/glossary/lookup';
import styles from './Term.module.css';

type TermProps = {
  // A glossary id such as "packet" or "subnet-mask".
  id: string;
  children: ReactNode;
};

// A word with its definition one click away: <Term id="packet">packet</Term>.
// An id that is not in the glossary renders the plain text, so a typo cannot
// break a lesson (validate.test.ts still catches it for built lessons).
export function Term({ id, children }: TermProps) {
  const entry = lookupTerm(glossary, id);
  if (entry === undefined) return <>{children}</>;
  return <DefinedTerm definition={entry.definition}>{children}</DefinedTerm>;
}

type DefinedTermProps = { definition: string; children: ReactNode };

function DefinedTerm({ definition, children }: DefinedTermProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // While open, listen on the whole document for Escape and for a press outside
  // this term. Both can happen while focus is not on the button, for example
  // after a mouse click in a browser that does not focus buttons.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Something else (an outer dialog) already used this Escape: leave it.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // Mark it handled so an outer dialog does not also close on this key.
      event.preventDefault();
      setOpen(false);
      // Focus that already fell to the page goes back to the word.
      if (document.activeElement === document.body) buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const inside =
        target instanceof Node && wrapperRef.current?.contains(target) === true;
      if (!inside) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className={styles.term}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
        }}
        onBlur={(event) => {
          // Focus moved to another control: close. Focus that goes nowhere, such
          // as a click on plain text, is handled by the outside press above.
          if (event.relatedTarget !== null) setOpen(false);
        }}
      >
        {children}
      </button>
      <span id={popoverId} className={styles.popover} hidden={!open}>
        {definition}
      </span>
    </span>
  );
}
