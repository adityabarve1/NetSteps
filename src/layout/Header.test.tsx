import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AuthProvider } from '@/auth/AuthProvider';
import { Header } from '@/layout/Header';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { createFakeSupabase, deferred, fakeSession } from '@/test/fakeSupabase';
import type { FakeSupabase } from '@/test/fakeSupabase';

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="location">{pathname}</p>;
}

function renderHeader(
  fake: FakeSupabase = createFakeSupabase(),
  client: FakeSupabase['client'] | null = fake.client,
  path = '/learn',
) {
  const view = render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider client={client}>
          <Header />
          <main>
            <Routes>
              <Route path="*" element={<Where />} />
            </Routes>
          </main>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
  return { fake, ...view };
}

describe('Header account links', () => {
  it('shows "Sign in" and no Profile link when signed out', async () => {
    renderHeader();

    const header = screen.getByRole('banner');
    expect(
      await within(header).findByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/login');
    expect(
      within(header).queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole('button', { name: 'Sign out' }),
    ).not.toBeInTheDocument();
  });

  it('shows "Profile" and "Sign out" and no Sign in link when signed in', async () => {
    renderHeader(createFakeSupabase({ session: fakeSession() }));

    const header = screen.getByRole('banner');
    expect(
      await within(header).findByRole('link', { name: 'Profile' }),
    ).toHaveAttribute('href', '/profile');
    expect(
      within(header).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
    expect(
      within(header).queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the Learn link in every state', async () => {
    renderHeader(createFakeSupabase({ session: fakeSession() }));

    expect(await screen.findByRole('link', { name: 'Learn' })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('shows neither account link while the session is still being read', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    renderHeader(fake);

    const header = screen.getByRole('banner');
    expect(
      within(header).queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument();

    pending.resolve({ data: { session: null }, error: null });
    expect(
      await within(header).findByRole('link', { name: 'Sign in' }),
    ).toBeInTheDocument();
  });

  it('still shows "Sign in" when sign-in is not set up, because that page explains it', () => {
    renderHeader(createFakeSupabase(), null);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('swaps to Profile and Sign out when someone signs in', async () => {
    const { fake } = renderHeader();
    await screen.findByRole('link', { name: 'Sign in' });

    fake.emit('SIGNED_IN', fakeSession());

    expect(
      await screen.findByRole('link', { name: 'Profile' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });

  it('signs out from this device and goes to the home page', async () => {
    const user = userEvent.setup();
    const { fake } = renderHeader(
      createFakeSupabase({ session: fakeSession() }),
      undefined,
      '/profile',
    );

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it.each([
    ['signed out', createFakeSupabase()],
    ['signed in', createFakeSupabase({ session: fakeSession() })],
  ])('has no axe violations when %s', async (_name, fake) => {
    const { container } = renderHeader(fake);
    await screen.findByRole('link', { name: /^(Sign in|Profile)$/ });

    expect(await axe(container)).toHaveNoViolations();
  });
});
