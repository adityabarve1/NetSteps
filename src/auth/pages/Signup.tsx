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
  MIN_PASSWORD_LENGTH,
  focusField,
  isChecked,
  readField,
  useNextPath,
  useSubmitGuard,
} from '@/auth/pages/formHelpers';

interface FieldErrors {
  email?: string;
  password?: string;
  consent?: string;
}

const FIELD_ORDER = ['email', 'password', 'consent'] as const;

function validate(email: string, password: string, agreed: boolean) {
  const errors: FieldErrors = {};
  if (email === '') {
    errors.email = 'Enter your email address.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${String(MIN_PASSWORD_LENGTH)} characters for your password.`;
  }
  if (!agreed) {
    errors.consent =
      'Please agree to the Privacy Policy and Terms to create your account.';
  }
  return errors;
}

// Opens in a new tab so the half-filled form is not lost.
function LegalLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </Link>
  );
}

export default function Signup() {
  const { status, signUp } = useAuth();
  const { next, withNext } = useNextPath();
  const { pending, run } = useSubmitGuard();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const consentId = useId();
  const consentErrorId = useId();
  const formErrorId = useId();

  if (status === 'signed-in') {
    // Confirmation is off (or already done): carry on to where they were headed.
    return <Navigate to={next} replace />;
  }
  if (status === 'unconfigured') {
    return (
      <AuthShell title="Create your account">
        <UnconfiguredNotice />
      </AuthShell>
    );
  }
  if (status === 'loading') {
    return (
      <AuthShell title="Create your account">
        <p role="status">Checking your sign-in…</p>
      </AuthShell>
    );
  }
  if (sentTo !== null) {
    return (
      <AuthShell title="Create your account">
        <div role="status" className={styles.success}>
          <h2>Check your email</h2>
          <p>
            We sent a confirmation link to <strong>{sentTo}</strong>. Open it to
            finish creating your account.
          </p>
          <p>It can take a few minutes. Look in your spam folder too.</p>
        </div>
        <ul className={styles.links}>
          <li>
            Already confirmed? <Link to={withNext('/login')}>Sign in</Link>
          </li>
          <GuestLink />
        </ul>
      </AuthShell>
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = readField(form, 'email').trim();
    const password = readField(form, 'password');

    const errors = validate(email, password, isChecked(form, 'consent'));
    setFieldErrors(errors);
    setFormError(null);
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      focusField(form, firstInvalid);
      return;
    }

    // `run` never rejects: signUp returns a result instead of throwing.
    void run(async () => {
      const result = await signUp(email, password);
      if (!result.ok) {
        setFormError(result.message);
      } else if (result.needsConfirmation) {
        setSentTo(email);
      }
      // Otherwise a session came back: the signed-in status redirects this page.
    });
  }

  return (
    <AuthShell title="Create your account">
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
          autoComplete="new-password"
          hint={`At least ${String(MIN_PASSWORD_LENGTH)} characters.`}
          error={fieldErrors.password}
        />
        <div className={styles.field}>
          <div className={styles.consent}>
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={
                fieldErrors.consent ? consentErrorId : undefined
              }
            />
            <label htmlFor={consentId}>
              I have read and agree to the{' '}
              <LegalLink to="/privacy">Privacy Policy</LegalLink> and the{' '}
              <LegalLink to="/terms">Terms of Service</LegalLink>.
            </label>
          </div>
          {fieldErrors.consent ? (
            <p id={consentErrorId} role="alert" className={styles.error}>
              {fieldErrors.consent}
            </p>
          ) : null}
        </div>
        {formError ? <FormAlert id={formErrorId} message={formError} /> : null}
        <SubmitButton
          pending={pending}
          idle="Create account"
          busy="Creating account…"
        />
      </form>
      <GoogleButton />
      <ul className={styles.links}>
        <li>
          Already have an account? <Link to={withNext('/login')}>Sign in</Link>
        </li>
        <GuestLink />
      </ul>
    </AuthShell>
  );
}
