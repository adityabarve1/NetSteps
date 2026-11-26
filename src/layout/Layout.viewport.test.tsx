// The owner's rule: every page fills the whole screen. These tests pin the
// shell structure and the CSS that does it, and that no main container is
// capped below the wide page width.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/auth/useAuth';
import { Layout } from '@/layout/Layout';
import { ProgressContext } from '@/progress/useProgress';
import { fakeProgress } from '@/test/lessonTestKit';
import { ThemeProvider } from '@/theme/ThemeProvider';

afterEach(() => {
  vi.restoreAllMocks();
});

const css = (file: string) =>
  readFileSync(resolve(process.cwd(), file), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

function ruleOf(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = new RegExp(
    `(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`,
    'm',
  ).exec(source);
  return found?.[1] ?? '';
}

function renderApp(initial = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          {
            index: true,
            element: (
              <>
                <h1>Home</h1>
                <Link to="/next">Go next</Link>
              </>
            ),
          },
          {
            path: 'next',
            element: (
              <>
                <h1>Next page</h1>
                <Link to="/next#part">Same page</Link>
              </>
            ),
          },
          { path: 'bare', element: <p>No heading here.</p> },
        ],
      },
    ],
    { initialEntries: [initial] },
  );
  const view = render(
    <ThemeProvider>
      <AuthContext
        value={{
          status: 'signed-out',
          user: null,
          passwordRecovery: false,
          signUp: vi.fn(),
          signIn: vi.fn(),
          signInWithGoogle: vi.fn(),
          signOut: vi.fn(),
          resetPassword: vi.fn(),
          updatePassword: vi.fn(),
          deleteAccount: vi.fn(),
          registerBeforeSignOut: () => () => undefined,
        }}
      >
        <ProgressContext value={fakeProgress()}>
          <RouterProvider router={router} />
        </ProgressContext>
      </AuthContext>
    </ThemeProvider>,
  );
  return { router, ...view };
}

describe('Layout shell structure', () => {
  it('puts the header, the main area and then the footer in one column', () => {
    renderApp('/next');
    const main = screen.getByRole('main');
    const footer = screen.getByRole('contentinfo');
    const header = screen.getByRole('banner');

    expect(main.parentElement).toBe(footer.parentElement);
    expect(header.compareDocumentPosition(main)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(main.nextElementSibling).toBe(footer);
    expect(footer.nextElementSibling).toBeNull();
  });
});

describe('Layout CSS: fills the viewport', () => {
  const layout = css('src/layout/Layout.module.css');

  it('is a flex column at least one viewport tall, with a 100vh, then 100svh, then 100dvh (later wins where supported)', () => {
    const shell = ruleOf(layout, '.shell');

    expect(shell).toMatch(/display:\s*flex/);
    expect(shell).toMatch(/flex-direction:\s*column/);
    expect(shell).toMatch(
      /min-height:\s*100vh;[\s\S]*min-height:\s*100svh;[\s\S]*min-height:\s*100dvh;/,
    );
    expect(shell).not.toMatch(/(?<!min-)height:/);
  });

  it('lets main grow so the footer sits at the bottom of a short page', () => {
    expect(ruleOf(layout, '.main')).toMatch(/flex:\s*1/);
    expect(ruleOf(layout, '.mainFull')).toMatch(/flex:\s*1/);
  });

  it('paints the page background across the whole shell, edge to edge', () => {
    expect(ruleOf(layout, '.shell')).toMatch(/background:/);
  });
});

describe('no hard cap below the wide page width', () => {
  // [file, selectors that are page-level containers]
  const containers: [string, string[]][] = [
    ['src/layout/Layout.module.css', ['.main']],
    ['src/layout/Header.module.css', ['.inner']],
    ['src/layout/Footer.module.css', ['.inner']],
    ['src/pages/CourseMap.module.css', ['.page', '.levels']],
    ['src/pages/LessonPage.module.css', ['.page']],
    ['src/auth/pages/AuthPages.module.css', ['.stage']],
  ];

  it.each(containers)(
    '%s: containers use --hero-width or no cap',
    (file, sels) => {
      const source = css(file);
      for (const selector of sels) {
        const rule = ruleOf(source, selector);
        const cap = /(?:^|[\s;])max-width:\s*([^;]+);/.exec(rule)?.[1];
        if (cap !== undefined) expect(cap).toContain('--hero-width');
      }
      expect(source).not.toMatch(/--content-width|72rem/);
    },
  );

  it('the old narrow column token is gone', () => {
    expect(css('src/theme/tokens.css')).not.toMatch(/--content-width/);
  });
});

describe('Layout: focus after a route change', () => {
  it('leaves focus alone on the first render', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: 'Home' })).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('moves focus to the new page heading, without scrolling', async () => {
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('link', { name: 'Go next' }));

    const heading = await screen.findByRole('heading', { name: 'Next page' });
    // Focus moves in an effect after the page shows, so wait for it.
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(heading).toHaveAttribute('tabindex', '-1');
    // Scrolling belongs to ScrollRestoration, so focus must not scroll.
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('falls back to the main area when the page has no heading', async () => {
    const { router } = renderApp('/');
    await router.navigate('/bare');

    await screen.findByText('No heading here.');
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  it('does not move focus for a link that only changes the hash', async () => {
    const user = userEvent.setup();
    renderApp('/next');
    const link = screen.getByRole('link', { name: 'Same page' });
    link.focus();
    await user.click(link);

    expect(link).toHaveFocus();
  });
});

describe('page CSS uses the width', () => {
  it('the course map lays level cards out in 1, 2 and 3 columns', () => {
    const source = css('src/pages/CourseMap.module.css');
    const base = ruleOf(source, '.levels');

    expect(base).toMatch(/display:\s*grid/);
    expect(base).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(source).toMatch(
      /@media \(min-width: 48rem\)\s*\{\s*\.levels\s*\{[^}]*repeat\(2,/,
    );
    expect(source).toMatch(
      /@media \(min-width: 90rem\)\s*\{\s*\.levels\s*\{[^}]*repeat\(3,/,
    );
  });

  it('the lesson page has a sticky side table of contents and a wide content column', () => {
    const source = css('src/pages/LessonPage.module.css');

    expect(source).toMatch(
      /@media \(min-width: 60rem\)\s*\{\s*\.page\s*\{[^}]*grid-template-columns:\s*14rem minmax\(0,\s*1fr\)/,
    );
    expect(source).toMatch(/\.tocColumn\s*\{[^}]*position:\s*sticky/);
    // The column itself is not capped; only running text inside it is.
    expect(ruleOf(source, '.content')).not.toMatch(/max-width/);
    expect(ruleOf(source, '.card')).not.toMatch(/max-width/);
  });

  it('caps running text at a readable measure and lets data-wide lift it', () => {
    const source = css('src/pages/LessonPage.module.css');
    const capped = /\.content section > :is\(p, ul, ol[^{]*\{([^}]*)\}/.exec(
      source,
    )?.[1];

    expect(capped).toMatch(/max-width:\s*var\(--measure\)/);
    expect(ruleOf(source, '.content')).toMatch(/--measure:\s*80ch/);
    expect(ruleOf(source, '.quizWrap')).toMatch(/max-width:\s*56rem/);
    expect(ruleOf(source, '.content [data-wide]')).toMatch(/max-width:\s*none/);
  });

  it('gives text and wide blocks one shared left edge (nothing is centred)', () => {
    const source = css('src/pages/LessonPage.module.css');
    const capped = /\.content section > :is\(p, ul, ol[^{]*\{([^}]*)\}/.exec(
      source,
    )?.[1];

    expect(capped).toMatch(/margin-inline:\s*0/);
    expect(capped).not.toMatch(/margin-inline:\s*auto/);
    expect(ruleOf(source, '.quizWrap')).toMatch(/margin-inline:\s*0/);
    expect(ruleOf(source, '.quizWrap')).not.toMatch(/margin-inline:\s*auto/);
  });

  it('centres the auth card on a full-height stage', () => {
    const stage = ruleOf(css('src/auth/pages/AuthPages.module.css'), '.stage');

    expect(stage).toMatch(/flex:\s*1/);
    expect(stage).toMatch(/align-content:\s*center/);
    expect(stage).toMatch(/justify-items:\s*center/);
  });

  it('text pages are one readable column', () => {
    expect(ruleOf(css('src/pages/ProsePage.module.css'), '.prose')).toMatch(
      /max-width:\s*70ch/,
    );
  });
});

describe('course map cards have equal height', () => {
  const source = css('src/pages/CourseMap.module.css');

  it('the grid gives every row the height of the tallest card from two columns up', () => {
    expect(source).toMatch(
      /@media \(min-width: 48rem\)\s*\{\s*\.levels\s*\{[^}]*grid-auto-rows:\s*1fr/,
    );
    expect(ruleOf(source, '.levels')).toMatch(/align-items:\s*stretch/);
    expect(ruleOf(source, '.levels')).not.toMatch(/grid-auto-rows/);
  });

  it('each card is a flex column that is never pinned to its own height', () => {
    const card = ruleOf(source, '.level');

    expect(card).toMatch(/display:\s*flex/);
    expect(card).toMatch(/flex-direction:\s*column/);
    expect(card).not.toMatch(/align-self|(?<!min-)(?<!max-)height:/);
    expect(ruleOf(source, '.rows')).toMatch(/flex:\s*1/);
  });
});

describe('header on very wide screens', () => {
  it('grows its type a little from 100rem up', () => {
    expect(css('src/layout/Header.module.css')).toMatch(
      /@media \(min-width: 100rem\)\s*\{[^@]*font-size:\s*1\.125rem/,
    );
  });
});
