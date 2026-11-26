import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AuthContext } from '@/auth/useAuth';
import type { AuthContextValue, AuthStatus } from '@/auth/useAuth';
import { curriculum } from '@/content/curriculum';
import type { LevelMeta } from '@/content/types';
import Landing, { LandingView } from '@/pages/Landing';
import { emptyProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { ProgressContext } from '@/progress/useProgress';
import type { ProgressContextValue } from '@/progress/useProgress';
import { opened, stateOf, T1 } from '@/test/progressFixtures';

const FIRST = 'l1-what-is-a-network';

// Fixed copies of the curriculum, so these tests do not change each time a
// lesson is built: one with only the first lesson built, one with none.
const withOneBuiltLesson: LevelMeta[] = curriculum.map((level, i) =>
  i === 0
    ? {
        ...level,
        lessons: level.lessons.map((lesson) =>
          lesson.id === FIRST ? { ...lesson, built: true } : lesson,
        ),
      }
    : level,
);

const nothingBuilt: LevelMeta[] = curriculum.map((level) => ({
  ...level,
  lessons: level.lessons.map((lesson) => ({
    ...lesson,
    built: false,
    labIds: [],
  })),
}));

function authValue(status: AuthStatus): AuthContextValue {
  return {
    status,
    user:
      status === 'signed-in'
        ? { id: 'u1', email: 'ada@example.com', displayName: null }
        : null,
    passwordRecovery: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    deleteAccount: vi.fn(),
    registerBeforeSignOut: () => () => undefined,
  };
}

function progressValue(
  state: ProgressState,
  ready: boolean,
): ProgressContextValue {
  return {
    state,
    ready,
    syncError: false,
    droppedCount: 0,
    openLesson: vi.fn(),
    submitQuiz: vi.fn(),
    completeLesson: vi.fn(),
    startLab: vi.fn(),
    completeLab: vi.fn(),
  };
}

interface Options {
  status?: AuthStatus;
  levels?: LevelMeta[];
  state?: ProgressState;
  ready?: boolean;
}

function renderLanding({
  status = 'signed-out',
  levels = curriculum,
  state = emptyProgress(),
  ready = true,
}: Options = {}) {
  return render(
    <MemoryRouter>
      <AuthContext value={authValue(status)}>
        <ProgressContext value={progressValue(state, ready)}>
          <main>
            <LandingView levels={levels} />
          </main>
        </ProgressContext>
      </AuthContext>
    </MemoryRouter>,
  );
}

describe('Landing page: headings and calls to action', () => {
  it('has exactly one h1, then h2 sections in order', () => {
    renderLanding();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'What you will learn',
      'How a lesson works',
      'Free and open to everyone',
      'Ready to start?',
    ]);
  });

  it('the default export renders the page with the real curriculum', () => {
    render(
      <MemoryRouter>
        <AuthContext value={authValue('signed-out')}>
          <ProgressContext value={progressValue(emptyProgress(), true)}>
            <Landing />
          </ProgressContext>
        </AuthContext>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /computers talk/i }),
    ).toBeInTheDocument();
    for (const level of curriculum) {
      expect(
        screen.getByRole('heading', { level: 3, name: level.title }),
      ).toBeInTheDocument();
    }
  });

  it('"Start learning free" goes to /learn', () => {
    renderLanding();

    const links = screen.getAllByRole('link', { name: 'Start learning free' });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) expect(link).toHaveAttribute('href', '/learn');
  });

  it('a signed-out visitor sees "Sign in" to /login and no "Continue learning"', () => {
    renderLanding({ status: 'signed-out' });

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      screen.queryByRole('link', { name: 'Continue learning' }),
    ).not.toBeInTheDocument();
  });

  it('a signed-in visitor sees "Continue learning" and no "Sign in"', () => {
    renderLanding({ status: 'signed-in' });

    expect(
      screen.getByRole('link', { name: 'Continue learning' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });

  it('while auth is loading shows neither "Sign in" nor "Continue learning"', () => {
    renderLanding({ status: 'loading' });

    expect(
      screen.queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Continue learning' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Start learning free' }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('"Continue learning" opens the lesson continueTarget picks', () => {
    renderLanding({
      status: 'signed-in',
      levels: withOneBuiltLesson,
      state: stateOf({ [FIRST]: opened(T1) }),
    });

    expect(
      screen.getByRole('link', { name: 'Continue learning' }),
    ).toHaveAttribute('href', `/learn/level-1/${FIRST}`);
  });

  it('"Continue learning" goes to /learn when no lesson is built yet', () => {
    renderLanding({ status: 'signed-in', ready: true, levels: nothingBuilt });

    expect(
      screen.getByRole('link', { name: 'Continue learning' }),
    ).toHaveAttribute('href', '/learn');
  });

  it('"Continue learning" goes to /learn while progress is not ready', () => {
    renderLanding({
      status: 'signed-in',
      levels: withOneBuiltLesson,
      state: stateOf({ [FIRST]: opened(T1) }),
      ready: false,
    });

    expect(
      screen.getByRole('link', { name: 'Continue learning' }),
    ).toHaveAttribute('href', '/learn');
  });
});

describe('Landing page: levels and lesson steps', () => {
  it('lists the seven levels with number, title and summary', () => {
    renderLanding();

    const list = screen.getByRole('list', { name: 'What you will learn' });
    const items = within(list).getAllByRole('listitem');
    expect(curriculum).toHaveLength(7);
    expect(items).toHaveLength(7);
    curriculum.forEach((level, i) => {
      const item = items[i];
      expect(item).toBeDefined();
      if (!item) return;
      expect(
        within(item).getByRole('heading', { level: 3, name: level.title }),
      ).toBeInTheDocument();
      expect(within(item).getByText(level.summary)).toBeInTheDocument();
      expect(
        within(item).getByText(`Level ${String(level.number)}`),
      ).toBeInTheDocument();
    });
  });

  it('marks every level with no built lesson "Coming soon"', () => {
    renderLanding({ levels: nothingBuilt });

    expect(screen.getAllByText('Coming soon')).toHaveLength(7);
  });

  it('with the real curriculum, Level 1 is open and Levels 2 to 7 are "Coming soon"', () => {
    renderLanding();

    expect(screen.getAllByText('Coming soon')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Open Level 1' })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('does not mark a level that has a built lesson, and links to it', () => {
    renderLanding({ levels: withOneBuiltLesson });

    expect(screen.getAllByText('Coming soon')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Open Level 1' })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('explains a lesson in four steps', () => {
    renderLanding();

    for (const step of [
      'Read it in plain words',
      'Watch it happen',
      'Try it yourself',
      'Check what you learned',
    ]) {
      expect(
        screen.getByRole('heading', { level: 3, name: step }),
      ).toBeInTheDocument();
    }
  });

  it('does not promise a number of lessons', () => {
    const { container } = renderLanding();

    expect(container.textContent).not.toMatch(/\b\d+\s+lessons\b/i);
  });
});

describe('Landing page: accessibility', () => {
  it('has no axe violations when signed out', async () => {
    const { container } = renderLanding({ status: 'signed-out' });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when signed in', async () => {
    const { container } = renderLanding({
      status: 'signed-in',
      levels: withOneBuiltLesson,
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Landing page: full-viewport hero', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'src/pages/Landing.module.css'),
    'utf8',
  );
  const heroRule = /\.hero\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('fills the viewport with 100vh, then 100svh, then 100dvh, each overriding the last where supported', () => {
    expect(heroRule).toMatch(
      /min-height:\s*100vh;[\s\S]*min-height:\s*100svh;[\s\S]*min-height:\s*100dvh;/,
    );
  });

  it('uses min-height only, so short screens never clip the content', () => {
    expect(heroRule).not.toMatch(/(?<!min-)height:/);
  });

  it('uses a wide hero box, not the 72rem reading column', () => {
    const inner = /\.heroInner\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const tokens = readFileSync(
      resolve(process.cwd(), 'src/theme/tokens.css'),
      'utf8',
    );
    const heroWidth = /--hero-width:\s*(\d+)rem/.exec(tokens)?.[1] ?? '0';

    expect(inner).toMatch(/width:\s*min\(100%,\s*var\(--hero-width\)\)/);
    expect(inner).not.toMatch(/--content-width|72rem/);
    expect(Number(heroWidth)).toBeGreaterThanOrEqual(100);
  });

  it('moves cards and buttons on hover only when motion is allowed', () => {
    const outsideMotionBlocks = css.replace(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/g,
      '',
    );

    expect(css).toMatch(/:hover[^{]*\{[^}]*transform/);
    expect(outsideMotionBlocks).not.toMatch(/:hover[^{]*\{[^}]*transform/);
  });

  it('keeps every section container as wide as the hero, not 72rem', () => {
    const container = /\.container\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

    expect(container).toMatch(/width:\s*min\(100%,\s*var\(--hero-width\)\)/);
    expect(css).not.toMatch(/--content-width|72rem/);
  });
});
