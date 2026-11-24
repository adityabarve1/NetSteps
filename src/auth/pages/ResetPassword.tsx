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
  MIN_PASSWORD_LENGTH,
  focusField,
  readField,
  useSubmitGuard,
} from '@/auth/pages/formHelpers';

interface FieldErrors {
  password?: string;
  confirm?: string;
}

function validate(password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${String(MIN_PASSWORD_LENGTH)} characters for your password.`;
  } else if (confirm !== password) {
    errors.confirm = 'The two passwords do not match.';
  }
  return errors;
}

export default function ResetPassword() {
  const { status, passwordRecovery, updatePassword } = useAuth();
  const { pending, run } = useSubmitGuard();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const formErrorId = useId();

  const title = 'Choose a new password';

  if (status === 'unconfigured') {
    return (
      <AuthShell title={title}>
        <UnconfiguredNotice />
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell title={title}>
        <div role="status" className={styles.success}>
          <p>Your password has been changed. You are signed in.</p>
        </div>
        <p>
          <Link to="/learn">Continue learning</Link>
        </p>
      </AuthShell>
    );
  }
  if (status === 'loading') {
    return (
      <AuthShell title={title}>
        <p role="status">Checking your link…</p>
      </AuthShell>
    );
  }
  // The form needs a session that came from a reset link. A link that was
  // already used, has timed out, or never arrived leaves no such session.
  // While a save is in flight the form stays up: saving ends the recovery
  // state a moment before this page learns it worked.
  if (status !== 'signed-in' || !(passwordRecovery || pending)) {
    return (
      <AuthShell title={title}>
        <div className={styles.notice}>
          <p>
            <strong>This link has expired or was already used.</strong> Reset
            links only work once, for a short time.
          </p>
          <p>
            <Link to="/forgot-password">Ask for a new link</Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = readField(form, 'password');
    const confirm = readField(form, 'confirm');

    const errors = validate(password, confirm);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.password || errors.confirm) {
      focusField(form, errors.password ? 'password' : 'confirm');
      return;
    }

    // `run` never rejects: updatePassword returns a result instead of throwing.
    void run(async () => {
      const result = await updatePassword(password);
      if (result.ok) {
        setDone(true);
      } else {
        setFormError(result.message);
      }
    });
  }

  return (
    <AuthShell title={title}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${String(MIN_PASSWORD_LENGTH)} characters.`}
          error={fieldErrors.password}
        />
        <TextField
          name="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.confirm}
          describedBy={formError ? formErrorId : undefined}
        />
        {formError ? <FormAlert id={formErrorId} message={formError} /> : null}
        <SubmitButton
          pending={pending}
          idle="Save new password"
          busy="Saving…"
        />
      </form>
    </AuthShell>
  );
}
