// Small pieces shared by the auth pages. Each page keeps its own h1 heading.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from '@/auth/pages/AuthPages.module.css';
import { siteConfig } from '@/config/site';

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.stage}>
      <div className={styles.card}>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

interface TextFieldProps {
  name: string;
  label: string;
  type: 'email' | 'password';
  autoComplete: 'email' | 'current-password' | 'new-password';
  /** Help shown under the field, read out with it. */
  hint?: string;
  /** A problem with this field. Marks it invalid and is announced as an alert. */
  error?: string | undefined;
  /** Ids of other elements that describe this field, e.g. a form-level alert. */
  describedBy?: string | undefined;
}

export function TextField({
  name,
  label,
  type,
  autoComplete,
  hint,
  error,
  describedBy,
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [
    hint ? hintId : '',
    error ? errorId : '',
    describedBy ?? '',
  ]
    .filter((part) => part !== '')
    .join(' ');

  // The input is not `required`: the page checks its fields itself, so every
  // message is worded the same way and announced, instead of a browser pop-up.
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className={styles.input}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={described === '' ? undefined : described}
      />
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A problem with the whole form (for example "Invalid login credentials"). */
export function FormAlert({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className={styles.formError}>
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <button type="submit" className={styles.primary} disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}

/** The state of a page when this copy of the site has no Supabase project. */
export function UnconfiguredNotice() {
  return (
    <div className={styles.notice}>
      <p>
        <strong>Sign-in isn&apos;t set up yet.</strong> This copy of{' '}
        {siteConfig.name} has no account service connected, so accounts are
        switched off.
      </p>
      <p>
        You can still learn as a guest. Your progress is saved in this browser.
      </p>
      <p>
        <Link to="/learn">Continue as guest</Link>
      </p>
    </div>
  );
}

export function GuestLink() {
  return (
    <li>
      <Link to="/learn">Continue as guest</Link>
    </li>
  );
}
