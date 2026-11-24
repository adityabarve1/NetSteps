import { Link } from 'react-router';
import { siteConfig } from '@/config/site';
import styles from '@/layout/Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} {siteConfig.name}
        </p>
        <nav aria-label="Legal">
          <ul className={styles.links}>
            <li>
              <Link to="/privacy">Privacy</Link>
            </li>
            <li>
              <Link to="/terms">Terms</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
