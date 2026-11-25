import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/auth/useAuth';
import { Layout } from '@/layout/Layout';
import { ProgressContext } from '@/progress/useProgress';
import { fakeProgress } from '@/pages/lessonTestKit';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { deferred } from '@/test/fakeSupabase';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLayout(slow?: Promise<null>) {
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
                <Link to="/slow">Go slow</Link>
                <Link to="/fast">Go fast</Link>
              </>
            ),
          },
          {
            path: 'slow',
            loader: () => slow ?? null,
            element: <h1>Slow page</h1>,
          },
          { path: 'fast', element: <h1>Fast page</h1> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(
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
  return router;
}

describe('Layout scroll restoration', () => {
  it('scrolls to the top when a new page opens', async () => {
    const scrollTo = vi.fn();
    vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo);
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('link', { name: 'Go fast' }));

    expect(
      await screen.findByRole('heading', { name: 'Fast page' }),
    ).toBeVisible();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('takes over scroll restoration from the browser', () => {
    renderLayout();

    expect(window.history.scrollRestoration).toBe('manual');
  });
});

describe('Layout pending cue', () => {
  it('is idle by default', () => {
    renderLayout();

    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    expect(document.querySelector('[data-pending]')).toBeNull();
  });

  it('marks main busy and shows a progress bar while a navigation is pending', async () => {
    const user = userEvent.setup();
    const slow = deferred<null>();
    renderLayout(slow.promise);
    await user.click(screen.getByRole('link', { name: 'Go slow' }));

    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('[data-pending]')).not.toBeNull();
    // Decorative: hidden from assistive technology.
    expect(document.querySelector('[data-pending]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    await act(async () => {
      slow.resolve(null);
      await slow.promise;
    });
    expect(
      await screen.findByRole('heading', { name: 'Slow page' }),
    ).toBeVisible();
    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    expect(document.querySelector('[data-pending]')).toBeNull();
  });
});
