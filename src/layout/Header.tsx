import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { siteConfig } from '@/config/site';
import styles from '@/layout/Header.module.css';
import { useTheme } from '@/theme/useTheme';
import type { ThemeMode } from '@/theme/useTheme';

const modeLabel: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

// The toggle cycles through every mode so "follow my system" stays reachable.
const nextMode: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {mode === 'light' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {mode === 'dark' && (
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      )}
      {mode === 'system' && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const next = nextMode[mode];

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={`Theme: ${modeLabel[mode]}. Switch to ${modeLabel[next]}.`}
      onClick={() => {
        setMode(next);
      }}
    >
      <ThemeIcon mode={mode} />
      <span className={styles.toggleText} aria-hidden="true">
        {modeLabel[mode]}
      </span>
    </button>
  );
}

// Profile and Sign out when signed in, Sign in otherwise. Nothing while the
// stored session is still being read, so a signed-in visitor never sees a
// flash of "Sign in".
function AccountLinks() {
  const { status, signOut } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') {
    return null;
  }
  if (status !== 'signed-in') {
    return (
      <li>
        <NavLink to="/login" className={styles.cta}>
          Sign in
        </NavLink>
      </li>
    );
  }
  return (
    <>
      <li>
        <NavLink to="/profile" className={styles.link}>
          Profile
        </NavLink>
      </li>
      <li>
        <button
          type="button"
          className={styles.signOut}
          onClick={() => {
            // Leave first, so a protected page does not bounce to the login
            // page on the way out. signOut never rejects.
            void navigate('/');
            void signOut();
          }}
        >
          Sign out
        </button>
      </li>
    </>
  );
}

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          {siteConfig.name}
        </Link>
        <div className={styles.actions}>
          <nav aria-label="Main">
            <ul className={styles.links}>
              <li>
                <NavLink to="/learn" className={styles.link}>
                  Learn
                </NavLink>
              </li>
              <AccountLinks />
            </ul>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
