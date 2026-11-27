import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import {
  AuthShell,
  FormAlert,
  GuestLink,
  SubmitButton,
  TextField,
  UnconfiguredNotice,
} from '@/auth/pages/AuthForm';
import { GoogleButton } from '@/auth/pages/GoogleButton';
import styles from '@/auth/pages/AuthPages.module.css';
import {
  focusField,
  readField,
  useNextPath,
  useSubmitGuard,
} from '@/auth/pages/formHelpers';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const { status, signIn } = useAuth();
  const { next, withNext } = useNextPath();
  const { pending, run } = useSubmitGuard();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorId = useId();

  if (status === 'signed-in') {
    // Already signed in, or just did: carry on to where they were headed.
    return <Navigate to={next} replace />;
  }
  if (status === 'unconfigured') {
    return (
      <AuthShell title="Sign in">
        <UnconfiguredNotice />
      </AuthShell>
    );
  }
  if (status === 'loading') {
    return (
      <AuthShell title="Sign in">
        <p role="status">Checking your sign-in…</p>
      </AuthShell>
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = readField(form, 'email').trim();
    const password = readField(form, 'password');

    const errors: FieldErrors = {};
    if (email === '') {
      errors.email = 'Enter your email address.';
    }
    if (password === '') {
      errors.password = 'Enter your password.';
    }
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password) {
      focusField(form, errors.email ? 'email' : 'password');
      return;
    }

    // `run` never rejects: signIn returns a result instead of throwing.
    void run(async () => {
      const result = await signIn(email, password);
      // On success the signed-in status redirects this page, so only a
      // failure needs showing.
      if (!result.ok) {
        setFormError(result.message);
      }
    });
  }

  return (
    <AuthShell title="Sign in">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
          describedBy={formError ? formErrorId : undefined}
        />
        {formError ? <FormAlert id={formErrorId} message={formError} /> : null}
        <SubmitButton pending={pending} idle="Sign in" busy="Signing in…" />
      </form>
      <GoogleButton />
      <ul className={styles.links}>
        <li>
          <Link to={withNext('/forgot-password')}>Forgot your password?</Link>
        </li>
        <li>
          New here? <Link to={withNext('/signup')}>Create an account</Link>
        </li>
        <GuestLink />
      </ul>
    </AuthShell>
  );
}
