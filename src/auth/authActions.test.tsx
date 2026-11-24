import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { fakeAuthError, fakeSession } from '@/test/fakeSupabase';
import { renderLoadedAuthHook } from '@/test/renderAuthHook';

describe('signIn', () => {
  it('sends the email and password and reports success', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    await expect(
      result.current.signIn('ada@example.com', 'correct horse'),
    ).resolves.toEqual({
      ok: true,
    });
    expect(fake.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct horse',
    });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });
  });

  it('returns the Supabase message when the sign-in is refused', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('Invalid login credentials'),
    });

    await expect(
      result.current.signIn('ada@example.com', 'wrong'),
    ).resolves.toEqual({
      ok: false,
      message: 'Invalid login credentials',
    });
    expect(result.current.status).toBe('signed-out');
  });

  it('turns a network failure into a friendly message', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('Failed to fetch', 0, 'AuthRetryableFetchError'),
    });

    await expect(result.current.signIn('a@b.co', 'password1')).resolves.toEqual(
      {
        ok: false,
        message:
          "We couldn't reach the server. Check your internet connection and try again.",
      },
    );
  });

  it('never throws, even when the client rejects', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.signInWithPassword.mockRejectedValueOnce(new Error('boom'));

    await expect(
      result.current.signIn('a@b.co', 'password1'),
    ).resolves.toMatchObject({
      ok: false,
    });
  });
});

describe('signUp', () => {
  it('asks for email confirmation when a user comes back without a session', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    await expect(
      result.current.signUp('new@example.com', 'long enough'),
    ).resolves.toEqual({
      ok: true,
      needsConfirmation: true,
    });
    expect(fake.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long enough',
      options: { emailRedirectTo: `${siteConfig.url}/auth/callback` },
    });
    expect(result.current.status).toBe('signed-out');
  });

  it('is signed in straight away when confirmation is off and a session comes back', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    const session = fakeSession({ email: 'new@example.com' });
    fake.signUp.mockResolvedValueOnce({
      data: { user: session.user, session },
      error: null,
    });

    await expect(
      result.current.signUp('new@example.com', 'long enough'),
    ).resolves.toEqual({
      ok: true,
      needsConfirmation: false,
    });
  });

  it('returns the Supabase message on failure', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: fakeAuthError('User already registered', 422),
    });

    await expect(
      result.current.signUp('a@b.co', 'long enough'),
    ).resolves.toEqual({
      ok: false,
      message: 'User already registered',
    });
  });
});

describe('signInWithGoogle', () => {
  it('asks Supabase for Google with a redirect back to /auth/callback', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    await expect(result.current.signInWithGoogle()).resolves.toEqual({
      ok: true,
    });
    expect(fake.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${siteConfig.url}/auth/callback` },
    });
  });

  it('returns the Supabase message when Google sign-in is refused', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: fakeAuthError('Unsupported provider: provider is not enabled'),
    });

    await expect(result.current.signInWithGoogle()).resolves.toEqual({
      ok: false,
      message: 'Unsupported provider: provider is not enabled',
    });
  });
});

describe('resetPassword', () => {
  it('asks Supabase for a reset link that returns to /reset-password', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    await expect(
      result.current.resetPassword('ada@example.com'),
    ).resolves.toEqual({ ok: true });
    expect(fake.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
      redirectTo: `${siteConfig.url}/reset-password`,
    });
  });

  it.each([
    ['user not found (400)', 400],
    ['no such user (404)', 404],
    ['too many requests (429)', 429],
  ])(
    'reports success for %s so no one can tell which addresses have accounts',
    async (_name, status) => {
      const { result, fake } = await renderLoadedAuthHook();
      fake.resetPasswordForEmail.mockResolvedValueOnce({
        error: fakeAuthError(
          'For security purposes, you can only request this after 60 seconds.',
          status,
        ),
      });

      await expect(
        result.current.resetPassword('ada@example.com'),
      ).resolves.toEqual({ ok: true });
    },
  );

  it.each([
    [
      'a server error (500)',
      fakeAuthError('Error sending recovery email', 500),
    ],
    [
      'a network failure',
      fakeAuthError('Failed to fetch', 0, 'AuthRetryableFetchError'),
    ],
  ])(
    'still reports %s, which does not depend on the address',
    async (_name, error) => {
      const { result, fake } = await renderLoadedAuthHook();
      fake.resetPasswordForEmail.mockResolvedValueOnce({ error });

      await expect(
        result.current.resetPassword('ada@example.com'),
      ).resolves.toMatchObject({
        ok: false,
      });
    },
  );
});
