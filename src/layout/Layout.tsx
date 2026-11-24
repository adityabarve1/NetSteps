import { Outlet } from 'react-router';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import styles from '@/layout/Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      <Header />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
