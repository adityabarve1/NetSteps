import { useId, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { FormAlert } from '@/auth/pages/AuthForm';
import { useSubmitGuard } from '@/auth/pages/formHelpers';
import styles from '@/auth/pages/AuthPages.module.css';
import { siteConfig } from '@/config/site';

// Shown only when this deployment has switched Google sign-in on. Clicking it
// leaves the site for Google and returns to /auth/callback.
export function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const { pending, run } = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  if (!siteConfig.googleEnabled) {
    return null;
  }

  function handleClick() {
    setError(null);
    // `run` never rejects: signInWithGoogle returns a result instead of throwing.
    void run(async () => {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <>
      <p className={styles.divider}>or</p>
      <button
        type="button"
        className={styles.secondary}
        disabled={pending}
        aria-describedby={error ? errorId : undefined}
        onClick={handleClick}
      >
        {pending ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error ? <FormAlert id={errorId} message={error} /> : null}
    </>
  );
}
