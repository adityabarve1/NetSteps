import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { safeNextPath } from '@/lib/safeNext';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Value of a text field, read from the form when it is submitted. The fields
 * are uncontrolled, so a password is never copied into React state.
 */
export function readField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}

export function isChecked(form: HTMLFormElement, name: string): boolean {
  return new FormData(form).has(name);
}

export function focusField(form: HTMLFormElement, name: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLElement) {
    field.focus();
  }
}

/**
 * Runs one submit at a time. `pending` drives the disabled button; the ref
 * also stops a second submit that arrives (Enter held down, a double click)
 * before React has re-rendered the disabled button.
 */
export function useSubmitGuard() {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      await task();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run };
}

/**
 * The page to go to after signing in: the sanitized ?next= value, or /learn.
 * `withNext` carries a valid ?next= over to a link to another auth page, so the
 * visitor still ends up where they were headed. A missing or hostile value is
 * dropped there rather than passed along.
 */
export function useNextPath() {
  const [params] = useSearchParams();
  const raw = params.get('next');
  const next = safeNextPath(raw);
  const carried = raw !== null && raw === next;

  const withNext = (to: string) =>
    carried ? `${to}?next=${encodeURIComponent(next)}` : to;

  return { next, withNext };
}
