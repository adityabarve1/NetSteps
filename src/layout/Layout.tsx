import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from 'react-router';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import styles from '@/layout/Layout.module.css';

export function Layout() {
  // The landing page is full-bleed: its hero fills the first screen and the
  // header floats on top of it. Every other page keeps the padded column.
  const landing = useLocation().pathname === '/';
  // A page (or its code) is still loading after a click: say so, lightly.
  const pending = useNavigation().state !== 'idle';

  return (
    <div className={styles.shell} data-landing={landing ? '' : undefined}>
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      {pending && (
        <div className={styles.pending} data-pending="" aria-hidden="true" />
      )}
      <Header overlay={landing} />
      <main
        id="main"
        className={landing ? styles.mainFull : styles.main}
        tabIndex={-1}
        aria-busy={pending || undefined}
      >
        <Outlet />
      </main>
      <Footer />
      {/* New pages open at the top; back and forward restore the position. */}
      <ScrollRestoration />
    </div>
  );
}
