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

const googleWas = siteConfig.googleEnabled;

afterEach(() => {
  siteConfig.googleEnabled = googleWas;
});

describe('Signup page', () => {
  async function fillIn(
    user: ReturnType<typeof renderAuthPage>['user'],
    password = 'long enough',
  ) {
    await user.type(await screen.findByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), password);
  }

  const consent = () =>
    screen.getByRole('checkbox', { name: /privacy policy.*terms/i });
  const submit = () => screen.getByRole('button', { name: 'Create account' });

  it('has one h1, labelled fields and correct autocomplete', async () => {
    renderAuthPage('/signup');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Create your account',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'autocomplete',
      'email',
    );
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(password).toHaveAccessibleDescription(/at least 8 characters/i);
  });

  it('links the consent text to the Privacy Policy and Terms', async () => {
    renderAuthPage('/signup');
    await screen.findByLabelText('Email');

    expect(
      screen.getByRole('link', { name: /privacy policy/i }),
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(consent()).not.toBeChecked();
  });

  it('links back to sign in, keeping a safe next path', async () => {
    renderAuthPage('/signup?next=%2Fprofile');
    await screen.findByLabelText('Email');

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?next=%2Fprofile',
    );
  });

  it('rejects a password under 8 characters without calling Supabase', async () => {
    const { user, fake } = renderAuthPage('/signup');
    await fillIn(user, 'short');
    await user.click(consent());
    await user.click(submit());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/at least 8 characters/i);
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Password')).toHaveFocus();
    expect(fake.signUp).not.toHaveBeenCalled();
  });

  it('accepts a password of exactly 8 characters', async () => {
    const { user, fake } = renderAuthPage('/signup');
    await fillIn(user, '12345678');
    await user.click(consent());
    await user.click(submit());

    await waitFor(() => {
      expect(fake.signUp).toHaveBeenCalledTimes(1);
    });
  });

  it('requires the Privacy and Terms consent before submitting', async () => {
    const { user, fake } = renderAuthPage('/signup');
    await fillIn(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /privacy policy and terms/i,
    );
    expect(consent()).toHaveAttribute('aria-invalid', 'true');
    expect(consent()).toHaveFocus();
    expect(fake.signUp).not.toHaveBeenCalled();
  });

  it('shows check-your-email, not an error, when confirmation is on', async () => {
    const { user, fake } = renderAuthPage('/signup');
    await fillIn(user);
    await user.click(consent());
    await user.click(submit());

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/check your email/i);
    expect(status).toHaveTextContent('new@example.com');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fake.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long enough',
      options: { emailRedirectTo: `${siteConfig.url}/auth/callback` },
    });
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('continues to the sanitized next path when confirmation is off', async () => {
    const fake = createFakeSupabase();
    fake.signUp.mockImplementationOnce(() => {
      const session = fakeSession({ email: 'new@example.com' });
      fake.emit('SIGNED_IN', session);
      return Promise.resolve({
        data: { user: session.user, session },
        error: null,
      });
    });
    const { user } = renderAuthPage('/signup?next=%2Flearn%2Flevel-1', fake);
    await fillIn(user);
    await user.click(consent());
    await user.click(submit());

    expect(
      await screen.findByRole('heading', { name: 'Elsewhere: /learn/level-1' }),
    ).toBeInTheDocument();
  });

  it('shows the Supabase message in an alert when sign-up fails', async () => {
    const fake = createFakeSupabase();
    fake.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('User already registered', 422),
    });
    const { user } = renderAuthPage('/signup', fake);
    await fillIn(user);
    await user.click(consent());
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'User already registered',
    );
    expect(submit()).toBeEnabled();
  });

  it('disables the button while the request is in flight and sends it only once', async () => {
    const pending = deferred<{
      data: { user: null; session: null };
      error: null;
    }>();
    const fake = createFakeSupabase();
    fake.signUp.mockReturnValueOnce(pending.promise);
    const { user } = renderAuthPage('/signup', fake);
    await fillIn(user);
    await user.click(consent());
    await user.click(submit());

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /creating/i }));
    expect(fake.signUp).toHaveBeenCalledTimes(1);

    act(() => {
      pending.resolve({ data: { user: null, session: null }, error: null });
    });
    await screen.findByRole('status');
  });

  it('shows the Google button only when switched on', async () => {
    siteConfig.googleEnabled = false;
    const first = renderAuthPage('/signup');
    await screen.findByLabelText('Email');
    expect(
      screen.queryByRole('button', { name: /google/i }),
    ).not.toBeInTheDocument();
    first.unmount();

    siteConfig.googleEnabled = true;
    renderAuthPage('/signup');
    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('says sign-in is not set up and offers the guest link when unconfigured', async () => {
    renderAuthPage('/signup', createFakeSupabase(), null);

    expect(
      await screen.findByText(/Sign-in isn't set up yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue as guest/i }),
    ).toHaveAttribute('href', '/learn');
    expect(
      screen.queryByRole('button', { name: 'Create account' }),
    ).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderAuthPage('/signup');
    await screen.findByLabelText('Email');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations while showing validation errors', async () => {
    const { user, container } = renderAuthPage('/signup');
    await fillIn(user, 'short');
    await user.click(submit());
    await screen.findAllByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
