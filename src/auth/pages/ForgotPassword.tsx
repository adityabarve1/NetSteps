import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import {
  AuthShell,
  FormAlert,
  SubmitButton,
  TextField,
  UnconfiguredNotice,
} from '@/auth/pages/AuthForm';
import styles from '@/auth/pages/AuthPages.module.css';
import {
  focusField,
  readField,
  useNextPath,
  useSubmitGuard,
} from '@/auth/pages/formHelpers';

export default function ForgotPassword() {
  const { status, resetPassword } = useAuth();
  const { withNext } = useNextPath();
  const { pending, run } = useSubmitGuard();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const formErrorId = useId();

  if (status === 'unconfigured') {
    return (
      <AuthShell title="Reset your password">
        <UnconfiguredNotice />
      </AuthShell>
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = readField(form, 'email').trim();

    setFormError(null);
    if (email === '') {
      setEmailError('Enter your email address.');
      focusField(form, 'email');
      return;
    }
    setEmailError(undefined);

    // `run` never rejects: resetPassword returns a result instead of throwing.
    void run(async () => {
      const result = await resetPassword(email);
      if (result.ok) {
        setSent(true);
      } else {
        setFormError(result.message);
      }
    });
  }

  return (
    <AuthShell title="Reset your password">
      {sent ? (
        // The same words for every address, so nobody can use this page to
        // find out which addresses have an account.
        <div role="status" className={styles.success}>
          <p>
            If that email has an account, we sent a link to reset your password.
            Check your inbox and your spam folder.
          </p>
        </div>
      ) : (
        <>
          <p>
            Enter the email you signed up with. We will email you a link to
            choose a new password.
          </p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              error={emailError}
              describedBy={formError ? formErrorId : undefined}
            />
            {formError ? (
              <FormAlert id={formErrorId} message={formError} />
            ) : null}
            <SubmitButton
              pending={pending}
              idle="Send reset link"
              busy="Sending…"
            />
          </form>
        </>
      )}
      <ul className={styles.links}>
        <li>
          <Link to={withNext('/login')}>Back to sign in</Link>
        </li>
      </ul>
    </AuthShell>
  );
}
