import { act, screen, waitFor } from '@testing-library/react';
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

afterEach(() => {
  window.location.hash = '';
});

const genericSent = /If that email has an account, we sent a link/;

describe('ForgotPassword page', () => {
  async function request(
    fake = createFakeSupabase(),
    email = 'ada@example.com',
  ) {
    const view = renderAuthPage('/forgot-password', fake);
    await view.user.type(await screen.findByLabelText('Email'), email);
    await view.user.click(
      screen.getByRole('button', { name: 'Send reset link' }),
    );
    return view;
  }

  it('has one h1, a labelled email field and a way back to sign in', async () => {
    renderAuthPage('/forgot-password');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Reset your password',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(
      screen.getByRole('link', { name: /back to sign in/i }),
    ).toHaveAttribute('href', '/login');
  });

  it('asks for a link that returns to /reset-password and shows the generic message', async () => {
    const { fake } = await request();

    expect(await screen.findByRole('status')).toHaveTextContent(genericSent);
    expect(fake.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
      redirectTo: `${siteConfig.url}/reset-password`,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['an address with an account', undefined],
    ['an unknown address', fakeAuthError('User not found', 400)],
    [
      'a request made too soon after the last one',
      fakeAuthError(
        'For security purposes, you can only request this after 60 seconds.',
        429,
      ),
    ],
  ])('shows the same message for %s', async (_name, error) => {
    const fake = createFakeSupabase();
    if (error) {
      fake.resetPasswordForEmail.mockResolvedValueOnce({ error });
    }
    await request(fake);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(
      'If that email has an account, we sent a link to reset your password. Check your inbox and your spam folder.',
    );
    expect(status).not.toHaveTextContent('ada@example.com');
  });

  it('still reports a failure that does not depend on the address', async () => {
    const fake = createFakeSupabase();
    fake.resetPasswordForEmail.mockResolvedValueOnce({
      error: fakeAuthError('Failed to fetch', 0, 'AuthRetryableFetchError'),
    });
    await request(fake);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /connection|reach/i,
    );
    expect(screen.queryByText(genericSent)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send reset link' }),
    ).toBeEnabled();
  });

  it('asks for an email without calling Supabase when the field is empty', async () => {
    const { user, fake } = renderAuthPage('/forgot-password');
    await user.click(
      await screen.findByRole('button', { name: 'Send reset link' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /enter your email/i,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fake.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('disables the button while the request is in flight and sends it only once', async () => {
    const pending = deferred<{ error: null }>();
    const fake = createFakeSupabase();
    fake.resetPasswordForEmail.mockReturnValueOnce(pending.promise);
    const { user } = renderAuthPage('/forgot-password', fake);
    await user.type(
      await screen.findByLabelText('Email'),
      'ada@example.com{Enter}',
    );

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(fake.resetPasswordForEmail).toHaveBeenCalledTimes(1);

    act(() => {
      pending.resolve({ error: null });
    });
    await screen.findByRole('status');
  });

  it('says sign-in is not set up when unconfigured', async () => {
    renderAuthPage('/forgot-password', createFakeSupabase(), null);

    expect(
      await screen.findByText(/Sign-in isn't set up yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue as guest/i }),
    ).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderAuthPage('/forgot-password');
    await screen.findByLabelText('Email');

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('AuthCallback page', () => {
  it('shows its heading and a status while the session is being worked out', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    renderAuthPage('/auth/callback', fake);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Signing you in' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/one moment/i);
    act(() => {
      pending.resolve({ data: { session: null }, error: null });
    });
    await waitFor(() => {
      expect(screen.queryByText(/one moment/i)).not.toBeInTheDocument();
    });
  });

  it('goes to the sanitized next path once a session exists', async () => {
    renderAuthPage(
      '/auth/callback?next=%2Flearn%2Flevel-1',
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /learn/level-1' }),
    ).toBeInTheDocument();
  });

  it('goes to /learn when no next path is given', async () => {
    renderAuthPage(
      '/auth/callback',
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /learn' }),
    ).toBeInTheDocument();
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
  ])('goes to /learn instead of the hostile next %j', async (next) => {
    renderAuthPage(
      `/auth/callback?next=${encodeURIComponent(next)}`,
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /learn' }),
    ).toBeInTheDocument();
  });

  it('waits for the session to arrive from the link, then redirects', async () => {
    const fake = createFakeSupabase();
    renderAuthPage('/auth/callback?next=%2Fprofile', fake);
    await screen.findByText(/couldn't finish signing you in|one moment/i);

    fake.emit('SIGNED_IN', fakeSession());

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /profile' }),
    ).toBeInTheDocument();
  });

  it('explains a link that did not work and links back to sign in', async () => {
    renderAuthPage('/auth/callback');

    expect(
      await screen.findByText(/couldn't finish signing you in/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Signing you in' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to sign in/i }),
    ).toHaveAttribute('href', '/login');
  });

  it('never shows text taken from the link', async () => {
    window.location.hash =
      '#error=access_denied&error_description=Call+555-0100+to+fix+your+account';
    renderAuthPage('/auth/callback');

    await screen.findByText(/couldn't finish signing you in/i);
    expect(screen.queryByText(/555-0100/)).not.toBeInTheDocument();
  });

  it('says sign-in is not set up when unconfigured', async () => {
    renderAuthPage('/auth/callback', createFakeSupabase(), null);

    expect(
      await screen.findByText(/Sign-in isn't set up yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue as guest/i }),
    ).toBeInTheDocument();
  });
});
