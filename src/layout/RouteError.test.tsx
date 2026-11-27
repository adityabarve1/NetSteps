import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, createMemoryRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AuthContext } from '@/auth/useAuth';
import { Layout } from '@/layout/Layout';
import { RouteError } from '@/layout/RouteError';
import { reloadPage } from '@/layout/reloadPage';
import { ProgressContext } from '@/progress/useProgress';
import { routes } from '@/routes';
import { fakeProgress } from '@/test/lessonTestKit';
import { ThemeProvider } from '@/theme/ThemeProvider';

vi.mock('@/layout/reloadPage', () => ({ reloadPage: vi.fn() }));
// A page whose chunk cannot be fetched, as when the visitor goes offline.
vi.mock('@/pages/Terms', () => ({
  get default(): never {
    throw new TypeError(
      'Failed to fetch dynamically imported module: /assets/Terms.js',
    );
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const chunkError = () =>
  new TypeError('Failed to fetch dynamically imported module: /assets/x.js');

function renderRoutes(table: RouteObject[], path: string) {
  const router = createMemoryRouter(table, { initialEntries: [path] });
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

function shellWith(child: RouteObject): RouteObject[] {
  return [
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          index: true,
          element: (
            <>
              <h1>Home</h1>
              <Link to="/bad">Bad</Link>
            </>
          ),
        },
        { ErrorBoundary: RouteError, children: [child] },
      ],
    },
  ];
}

describe('RouteError for a failed page chunk', () => {
  const failing = shellWith({
    path: 'bad',
    lazy: () => Promise.reject(chunkError()),
  });

  it('keeps the header and footer and shows an alert', async () => {
    const user = userEvent.setup();
    renderRoutes(failing, '/');
    await user.click(screen.getByRole('link', { name: 'Bad' }));
    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: /could not load this page/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('reloads the page from the Reload button', async () => {
    const user = userEvent.setup();
    renderRoutes(failing, '/');
    await user.click(screen.getByRole('link', { name: 'Bad' }));
    await user.click(await screen.findByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('goes home from the Go home link and clears the alert', async () => {
    const user = userEvent.setup();
    renderRoutes(failing, '/bad');
    const alert = await screen.findByRole('alert');
    await user.click(within(alert).getByRole('link', { name: 'Go home' }));
    expect(
      await screen.findByRole('heading', { name: 'Home' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('RouteError for any other error', () => {
  it('does not hide it: it goes on to the next error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderRoutes(
      shellWith({
        path: 'bad',
        lazy: () => Promise.reject(new Error('real bug')),
      }),
      '/bad',
    );
    expect(
      await screen.findByText(/Unexpected Application Error/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
  });
});

describe('the real route table', () => {
  it('shows the chunk failure inside the shell for a page that will not load', async () => {
    renderRoutes(routes, '/terms');
    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('button', { name: 'Reload' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
