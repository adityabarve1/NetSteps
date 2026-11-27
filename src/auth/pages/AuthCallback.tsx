import { Link, Navigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { AuthShell, UnconfiguredNotice } from '@/auth/pages/AuthForm';
import styles from '@/auth/pages/AuthPages.module.css';
import { safeNextPath } from '@/lib/safeNext';

// Where email-confirmation links and Google sign-in return to. The Supabase
// client turns the link into a session when the app loads; this page waits for
// that and then moves on to the sanitized ?next= path (or /learn).
export default function AuthCallback() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'signed-in') {
    return <Navigate to={safeNextPath(params.get('next'))} replace />;
  }

  return (
    <AuthShell title="Signing you in">
      {status === 'unconfigured' ? (
        <UnconfiguredNotice />
      ) : status === 'loading' ? (
        <p role="status">One moment while we finish signing you in…</p>
      ) : (
        // Fixed wording on purpose: nothing from the link is shown, so a crafted
        // link cannot put its own message on this page.
        <div className={styles.notice}>
          <p>
            <strong>We couldn&apos;t finish signing you in.</strong> The link
            may have expired, or it was already used.
          </p>
          <p>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
