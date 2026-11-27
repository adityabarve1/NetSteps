import { Link } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { curriculum } from '@/content/curriculum';
import type { LevelMeta } from '@/content/types';
import { HeroAnimation } from '@/pages/HeroAnimation';
import styles from '@/pages/Landing.module.css';
import {
  FinalCta,
  FreeNote,
  LessonSteps,
  LevelsSection,
} from '@/pages/LandingSections';
import { continueTarget } from '@/progress/logic';
import { useProgress } from '@/progress/useProgress';

// Where "Continue learning" goes: the lesson the progress rules pick, or the
// course map when there is none yet (no lesson built, or progress still loading).
function ContinueLink({ levels }: { levels: LevelMeta[] }) {
  const { state, ready } = useProgress();
  const id = ready ? continueTarget(state, levels) : null;
  const level = levels.find((l) =>
    l.lessons.some((lesson) => lesson.id === id),
  );
  const href =
    id !== null && level !== undefined ? `/learn/${level.id}/${id}` : '/learn';

  return (
    <Link to={href} className={styles.secondary}>
      Continue learning
    </Link>
  );
}

// The second button: "Sign in" for a visitor with no account session,
// "Continue learning" for a signed-in one, and nothing while the stored session
// is still being read, so neither button flashes up and then changes.
function AccountButton({ levels }: { levels: LevelMeta[] }) {
  const { status } = useAuth();

  if (status === 'loading') return null;
  if (status === 'signed-in') return <ContinueLink levels={levels} />;
  return (
    <Link to="/login" className={styles.secondary}>
      Sign in
    </Link>
  );
}

function Hero({ levels }: { levels: LevelMeta[] }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>An interactive networking course</p>
          <h1 id="hero-title" className={styles.title}>
            Learn how computers talk to each other,{' '}
            <span className={styles.highlight}>by playing with it</span>
          </h1>
          <p className={styles.lead}>
            Free for everyone, with no sign-up needed. Your progress is saved on
            this device, and in your account if you sign in.
          </p>
          <div className={styles.actions}>
            <Link to="/learn" className={styles.primary}>
              Start learning free
            </Link>
            <AccountButton levels={levels} />
          </div>
        </div>
        <div className={styles.heroArt}>
          <HeroAnimation />
        </div>
      </div>
    </section>
  );
}

// The page itself. `levels` is a prop so tests can show a course with a built
// lesson; the route uses the real curriculum.
export function LandingView({ levels }: { levels: LevelMeta[] }) {
  return (
    <>
      <Hero levels={levels} />
      <LevelsSection levels={levels} />
      <LessonSteps />
      <FreeNote />
      <FinalCta />
    </>
  );
}

export default function Landing() {
  return <LandingView levels={curriculum} />;
}
