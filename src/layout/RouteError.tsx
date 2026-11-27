import { Link, useRouteError } from 'react-router';
import { isChunkLoadError } from '@/layout/chunkError';
import { reloadPage } from '@/layout/reloadPage';
import styles from '@/layout/RouteError.module.css';

// The error boundary for every page route. It sits inside <Layout />, so the
// header and footer stay on screen. It only handles failed chunk loads; any
// other error is thrown again so the next boundary shows it, never hidden.
export function RouteError() {
  const error = useRouteError();
  if (!isChunkLoadError(error)) throw error;

  return (
    <div className={styles.message} role="alert">
      <h1 className={styles.title}>We could not load this page</h1>
      <p>
        The page did not download. You may be offline, or the site may have been
        updated. Check your connection and try again.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={reloadPage}>
          Reload
        </button>
        <Link className={styles.linkButton} to="/">
          Go home
        </Link>
      </div>
    </div>
  );
}
