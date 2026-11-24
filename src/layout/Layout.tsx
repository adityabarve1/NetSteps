import { Outlet, useLocation } from 'react-router';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import styles from '@/layout/Layout.module.css';

export function Layout() {
  // The landing page is full-bleed: its hero fills the first screen and the
  // header floats on top of it. Every other page keeps the padded column.
  const landing = useLocation().pathname === '/';

  return (
    <div className={styles.shell} data-landing={landing ? '' : undefined}>
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      <Header overlay={landing} />
      <main
        id="main"
        className={landing ? styles.mainFull : styles.main}
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
