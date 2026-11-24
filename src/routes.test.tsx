import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { siteConfig } from '@/config/site';
import { routes } from '@/routes';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

// The route table of spec section 9, with the lesson route as /learn/:levelId/:lessonId.
const routeTable: [path: string, heading: string][] = [
  ['/', 'Learn computer networking'],
  ['/learn', 'Course map'],
  ['/learn/level-1/l1-what-is-a-network', 'Lesson'],
  ['/profile', 'Profile'],
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

    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument();
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
      within(header).getByRole('link', { name: 'Sign in' }),
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
