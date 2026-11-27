import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from '@/pages/Profile.module.css';

const PHRASE = 'DELETE';
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled)';

interface Props {
  /** Resolves to an error message to show, or null when the account is gone. */
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}

// A modal confirmation. Focus goes to the text field, Tab stays inside, Escape
// closes (except while deleting), and focus returns to what opened it.
export function DeleteAccountDialog({ onConfirm, onClose }: Props) {
  const titleId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const opener = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  async function confirm() {
    setBusy(true);
    setError(null);
    const message = await onConfirm();
    // On success this page is already gone; only a failure comes back here.
    if (message !== null) {
      setError(message);
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (!busy) onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = items?.[0];
    const last = items?.[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.backdrop}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a modal dialog must handle Escape and Tab itself */}
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>Delete your account?</h2>
        <p>
          This permanently deletes your account, your progress, your quiz scores
          and your lab progress. It cannot be undone.
        </p>
        <label className={styles.field}>
          Type {PHRASE} to confirm
          <input
            ref={inputRef}
            type="text"
            value={typed}
            disabled={busy}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-describedby={error === null ? undefined : errorId}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
          />
        </label>
        {error === null ? null : (
          <p id={errorId} role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={busy || typed !== PHRASE}
            onClick={() => {
              void confirm();
            }}
          >
            {busy ? 'Deleting…' : 'Delete my account forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
