import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { LevelMeta } from '@/content/types';
import { cx } from '@/lib/cx';
import styles from '@/pages/Landing.module.css';

// A level is "coming soon" until at least one of its lessons is built.
function hasBuiltLesson(level: LevelMeta): boolean {
  return level.lessons.some((lesson) => lesson.built);
}

export function LevelsSection({ levels }: { levels: LevelMeta[] }) {
  return (
    <section className={styles.section} aria-labelledby="levels-title">
      <div className={styles.container}>
        <h2 id="levels-title" className={styles.sectionTitle}>
          What you will learn
        </h2>
        <p className={styles.sectionLead}>
          The course starts from zero. Each level builds on the one before it,
          from the basics to modern, secure networks.
        </p>
        <ol className={styles.levels} aria-labelledby="levels-title">
          {levels.map((level) => (
            <li key={level.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.levelNumber}>Level {level.number}</span>
                {!hasBuiltLesson(level) && (
                  <span className={styles.soon}>Coming soon</span>
                )}
              </div>
              <h3 className={styles.cardTitle}>{level.title}</h3>
              <p className={styles.cardText}>{level.summary}</p>
              {hasBuiltLesson(level) && (
                <Link to="/learn" className={styles.cardLink}>
                  Open Level {level.number}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Plain stroked icons, drawn from the same few shapes. Decorative.
function StepIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.stepIcon}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const steps: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Read it in plain words',
    text: 'Short sections explain one idea at a time, in plain words, with everyday comparisons.',
    icon: (
      <>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
      </>
    ),
  },
  {
    title: 'Watch it happen',
    text: 'Step through a simulation and see data travel from one device to another.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5z" />
      </>
    ),
  },
  {
    title: 'Try it yourself',
    text: 'Change a setting or break a link, and see what happens straight away.',
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
  },
  {
    title: 'Check what you learned',
    text: 'Answer a short quiz, then keep a small cheat sheet to look back at.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 3 3 5-6" />
      </>
    ),
  },
];

export function LessonSteps() {
  return (
    <section
      className={cx(styles.section, styles.sectionTint)}
      aria-labelledby="steps-title"
    >
      <div className={styles.container}>
        <h2 id="steps-title" className={styles.sectionTitle}>
          How a lesson works
        </h2>
        <p className={styles.sectionLead}>
          Every lesson follows the same four steps, so you always know what
          comes next.
        </p>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepBadge}>
                <StepIcon>{step.icon}</StepIcon>
              </span>
              <p className={styles.stepNumber} aria-hidden="true">
                Step {i + 1}
              </p>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FreeNote() {
  return (
    <section className={styles.section} aria-labelledby="free-title">
      <div className={cx(styles.container, styles.note)}>
        <h2 id="free-title" className={styles.sectionTitle}>
          Free and open to everyone
        </h2>
        <p className={styles.noteText}>
          The whole course is free to read. You do not need an account. Sign in
          only if you want your progress saved on all your devices.
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={styles.final} aria-labelledby="final-title">
      <div className={cx(styles.container, styles.note)}>
        <h2 id="final-title" className={styles.sectionTitle}>
          Ready to start?
        </h2>
        <p className={styles.noteText}>
          Start with the course map and follow it one level at a time.
        </p>
        <Link to="/learn" className={styles.primary}>
          Start learning free
        </Link>
      </div>
    </section>
  );
}
