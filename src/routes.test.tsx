import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AuthProvider } from '@/auth/AuthProvider';
import { siteConfig } from '@/config/site';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { routes } from '@/routes';
import { createFakeSupabase, fakeSession } from '@/test/fakeSupabase';
import type { FakeSupabase } from '@/test/fakeSupabase';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Signed out by default. Pass a fake with a session to render a signed-in visit.
function renderAt(path: string, fake: FakeSupabase = createFakeSupabase()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <ThemeProvider>
      <AuthProvider client={fake.client}>
        <ProgressProvider client={fake.client}>
          <RouterProvider router={router} />
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
  return { router, fake, ...view };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

// The route table of spec section 9, with the lesson route as /learn/:levelId/:lessonId.
const routeTable: [path: string, heading: string | RegExp][] = [
  ['/', /Learn how computers talk to each other/],
  ['/learn', 'Course map'],
  ['/learn/level-1/l1-what-is-a-network', 'Lesson not found'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/login', 'Sign in'],
  ['/signup', 'Create your account'],
  ['/forgot-password', 'Reset your password'],
  ['/reset-password', 'Choose a new password'],
  ['/auth/callback', 'Signing you in'],
];

describe('routes', () => {
  it.each(routeTable)('%s renders its page heading', async (path, heading) => {
    renderAt(path);

    // Each page is a lazy chunk, so the first render can take a moment.
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: heading },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('redirects a signed-out /profile to /login with the page to come back to', async () => {
    const { router } = renderAt('/profile');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fprofile');
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Profile' }),
    ).not.toBeInTheDocument();
  });

  it('shows /profile to a signed-in visitor, inside the shell', async () => {
    const { router } = renderAt(
      '/profile',
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Profile' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/profile');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('sends a signed-out visitor back to the page they wanted after signing in', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/profile');
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Profile' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/profile');
  });

  it('renders the not-found page with a link home for an unknown path', async () => {
    renderAt('/no/such/page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to the home page' }),
    ).toHaveAttribute('href', '/');
  });

  it('keeps the shell around the not-found page', async () => {
    renderAt('/no/such/page');

    await screen.findByRole('heading', { name: 'Page not found' });
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('puts the header over the hero on the landing page only', async () => {
    const { container, router } = renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('[data-landing]')).not.toBeNull();

    await act(() => router.navigate('/learn'));
    await screen.findByRole('heading', { level: 1, name: 'Course map' });
    expect(container.querySelector('[data-landing]')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = renderAt('/');
    await screen.findByRole('heading', { level: 1 });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has a main landmark, a skip link and named navigation', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main');
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
  });

  it('shows the product name from config and links to Learn and Sign in', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    const header = screen.getByRole('banner');

    expect(
      within(header).getByRole('link', { name: siteConfig.name }),
    ).toHaveAttribute('href', '/');
    expect(within(header).getByRole('link', { name: 'Learn' })).toHaveAttribute(
      'href',
      '/learn',
    );
    expect(
      await within(header).findByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/login');
  });

  it('links to Privacy and Terms from the footer', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    const footer = screen.getByRole('contentinfo');

    expect(
      within(footer).getByRole('link', { name: 'Privacy' }),
    ).toHaveAttribute('href', '/privacy');
    expect(within(footer).getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  it('navigates when a header link is used', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });

    await user.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Learn' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Course map' }),
    ).toBeInTheDocument();
  });

  it('has a theme toggle with an accessible name that cycles the theme', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });

    const toggle = screen.getByRole('button', { name: /^Theme: System/ });
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(toggle);
    expect(
      screen.getByRole('button', { name: /^Theme: Light/ }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('button', { name: /^Theme: Light/ }));
    expect(
      screen.getByRole('button', { name: /^Theme: Dark/ }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: /^Theme: Dark/ }));
    expect(
      screen.getByRole('button', { name: /^Theme: System/ }),
    ).toBeInTheDocument();
  });
});
