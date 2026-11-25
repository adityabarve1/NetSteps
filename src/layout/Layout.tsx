import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from 'react-router';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import styles from '@/layout/Layout.module.css';

// After a new page opens, focus goes to its h1 (or to main when it has none),
// so a keyboard or screen reader user starts at the top of the new page, as a
// full page load would. preventScroll leaves scrolling to ScrollRestoration:
// new pages open at the top, back and forward restore the old position. The
// first render and hash-only changes are left alone (pathname must change).
function useFocusOnNavigation(main: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const heading = main.current?.querySelector('h1');
    if (heading) heading.setAttribute('tabindex', '-1');
    (heading ?? main.current)?.focus({ preventScroll: true });
  }, [pathname, main]);
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnNavigation(mainRef);
  // The landing page is full-bleed: its hero fills the first screen and the
  // header floats on top of it. Every other page keeps the padded column.
  // data-landing below is a styling hook and a test hook, nothing reads it at runtime.
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
        ref={mainRef}
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
