import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { siteConfig } from '@/config/site';
import {
  createFakeSupabase,
  deferred,
  fakeAuthError,
  fakeSession,
} from '@/test/fakeSupabase';
import { renderAuthPage } from '@/test/renderAuthPage';

const googleWas = siteConfig.googleEnabled;

afterEach(() => {
  siteConfig.googleEnabled = googleWas;
});

const location = () => screen.getByTestId('location').textContent;

describe('Login page', () => {
  it('has one h1, labelled fields with the right types and autocomplete', async () => {
    renderAuthPage('/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  it('links to sign-up, forgot-password and continuing as a guest', async () => {
    renderAuthPage('/login');
    await screen.findByLabelText('Email');

    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup');
    expect(
      screen.getByRole('link', { name: /forgot your password/i }),
    ).toHaveAttribute('href', '/forgot-password');
    expect(
      screen.getByRole('link', { name: /continue as guest/i }),
    ).toHaveAttribute('href', '/learn');
  });

  it('keeps a safe next path on the links to the other auth pages', async () => {
    renderAuthPage('/login?next=%2Fprofile');
    await screen.findByLabelText('Email');

    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup?next=%2Fprofile');
    expect(
      screen.getByRole('link', { name: /forgot your password/i }),
    ).toHaveAttribute('href', '/forgot-password?next=%2Fprofile');
  });

  it('drops a hostile next path from the links to the other auth pages', async () => {
    renderAuthPage('/login?next=%2F%2Fevil.com');
    await screen.findByLabelText('Email');

    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup');
  });

  it('signs in and goes to the sanitized next path', async () => {
    const { user, fake } = renderAuthPage('/login?next=%2Flearn%2Flevel-1');
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(fake.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct horse',
    });
    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /learn/level-1' }),
    ).toBeInTheDocument();
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', ''])(
    'goes to /learn instead of the hostile next %j',
    async (next) => {
      const { user } = renderAuthPage(
        `/login?next=${encodeURIComponent(next)}`,
      );
      await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
      await user.type(screen.getByLabelText('Password'), 'correct horse');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(
        await screen.findByRole('heading', { name: 'Elsewhere: /learn' }),
      ).toBeInTheDocument();
    },
  );

  it('sends a signed-in visitor straight on', async () => {
    renderAuthPage(
      '/login?next=%2Fprofile',
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /profile' }),
    ).toBeInTheDocument();
  });

  it('shows the Supabase error in an alert for a wrong password and keeps the form usable', async () => {
    const fake = createFakeSupabase();
    fake.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('Invalid login credentials'),
    });
    const { user } = renderAuthPage('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'nope nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid login credentials',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /Invalid login credentials/,
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(location()).toBe('/login');
    expect(location()).not.toContain('nope');
  });

  it('asks for the missing fields without calling Supabase', async () => {
    const { user, fake } = renderAuthPage('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(fake.signInWithPassword).not.toHaveBeenCalled();
  });

  it('ignores a second submit event that arrives before the button is disabled', async () => {
    const pending = deferred<{
      data: { user: null; session: null };
      error: null;
    }>();
    const fake = createFakeSupabase();
    fake.signInWithPassword.mockReturnValueOnce(pending.promise);
    const { user } = renderAuthPage('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    const form = screen.getByLabelText('Email').closest('form');
    if (!form) {
      throw new Error('the login form is missing');
    }

    // Dispatched directly, so a disabled button cannot stop them.
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fake.signInWithPassword).toHaveBeenCalledTimes(1);
    act(() => {
      pending.resolve({ data: { user: null, session: null }, error: null });
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });
  });

  it('disables the button while the request is in flight and sends it only once', async () => {
    const pending = deferred<{
      data: { user: null; session: null };
      error: null;
    }>();
    const fake = createFakeSupabase();
    fake.signInWithPassword.mockReturnValueOnce(pending.promise);
    const { user } = renderAuthPage('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse{Enter}');

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /signing in/i }));
    expect(fake.signInWithPassword).toHaveBeenCalledTimes(1);

    act(() => {
      pending.resolve({ data: { user: null, session: null }, error: null });
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });
  });

  it('shows no Google button unless Google sign-in is switched on', async () => {
    siteConfig.googleEnabled = false;
    renderAuthPage('/login');
    await screen.findByLabelText('Email');

    expect(
      screen.queryByRole('button', { name: /google/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a working Google button when Google sign-in is switched on', async () => {
    siteConfig.googleEnabled = true;
    const { user, fake } = renderAuthPage('/login');

    await user.click(
      await screen.findByRole('button', { name: /continue with google/i }),
    );

    expect(fake.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${siteConfig.url}/auth/callback` },
    });
  });

  it('says sign-in is not set up and offers the guest link when unconfigured', async () => {
    const { fake } = renderAuthPage('/login', createFakeSupabase(), null);

    expect(
      await screen.findByText(/Sign-in isn't set up yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue as guest/i }),
    ).toHaveAttribute('href', '/learn');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(fake.getSession).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = renderAuthPage('/login');
    await screen.findByLabelText('Email');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations while showing an error', async () => {
    const fake = createFakeSupabase();
    fake.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('Invalid login credentials'),
    });
    const { user, container } = renderAuthPage('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'nope nope{Enter}');
    await screen.findByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
