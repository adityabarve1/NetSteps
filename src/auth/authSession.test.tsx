import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFakeSupabase,
  fakeAuthError,
  fakeSession,
} from '@/test/fakeSupabase';
import { renderAuthHook, renderLoadedAuthHook } from '@/test/renderAuthHook';

afterEach(() => {
  window.location.hash = '';
});

describe('signOut', () => {
  it('signs out of this device only and clears the user', async () => {
    const fake = createFakeSupabase({ session: fakeSession() });
    const { result } = renderAuthHook(fake);
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });

    await result.current.signOut();

    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
    expect(result.current.user).toBeNull();
  });

  it.each([
    ['returns an error', 'error'],
    ['rejects', 'reject'],
  ])(
    'still clears the user when the network is down and the call %s',
    async (_name, mode) => {
      const fake = createFakeSupabase({ session: fakeSession() });
      const { result } = renderAuthHook(fake);
      await waitFor(() => {
        expect(result.current.status).toBe('signed-in');
      });
      if (mode === 'error') {
        fake.signOut.mockResolvedValueOnce({
          error: fakeAuthError('Failed to fetch', 0, 'AuthRetryableFetchError'),
        });
      } else {
        fake.signOut.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      }

      await expect(result.current.signOut()).resolves.toBeUndefined();

      await waitFor(() => {
        expect(result.current.status).toBe('signed-out');
      });
      expect(result.current.user).toBeNull();
    },
  );
});

describe('password recovery', () => {
  it('starts without a recovery session', async () => {
    const { result } = await renderLoadedAuthHook();
    expect(result.current.passwordRecovery).toBe(false);
  });

  it('notes a PASSWORD_RECOVERY event along with the session it brings', async () => {
    const { result, fake } = await renderLoadedAuthHook();

    fake.emit('PASSWORD_RECOVERY', fakeSession());

    expect(result.current.passwordRecovery).toBe(true);
    expect(result.current.status).toBe('signed-in');
  });

  it('knows about a recovery link from the address bar before the library clears it', async () => {
    window.location.hash = '#access_token=abc&type=recovery';
    const { result } = renderAuthHook(
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(result.current.passwordRecovery).toBe(true);
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });
  });

  it('ignores other address-bar fragments', () => {
    window.location.hash = '#access_token=abc&type=signup';
    const { result } = renderAuthHook();

    expect(result.current.passwordRecovery).toBe(false);
  });

  it('updatePassword sends the password and ends the recovery state', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.emit('PASSWORD_RECOVERY', fakeSession());

    await expect(
      result.current.updatePassword('a brand new one'),
    ).resolves.toEqual({ ok: true });

    expect(fake.updateUser).toHaveBeenCalledWith({
      password: 'a brand new one',
    });
    await waitFor(() => {
      expect(result.current.passwordRecovery).toBe(false);
    });
  });

  it('updatePassword returns the Supabase message and keeps the recovery state on failure', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.emit('PASSWORD_RECOVERY', fakeSession());
    fake.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: fakeAuthError(
        'New password should be different from the old password.',
        422,
      ),
    });

    await expect(
      result.current.updatePassword('same as before'),
    ).resolves.toEqual({
      ok: false,
      message: 'New password should be different from the old password.',
    });
    expect(result.current.passwordRecovery).toBe(true);
  });

  it('signing out ends the recovery state', async () => {
    const { result, fake } = await renderLoadedAuthHook();
    fake.emit('PASSWORD_RECOVERY', fakeSession());

    await result.current.signOut();

    await waitFor(() => {
      expect(result.current.passwordRecovery).toBe(false);
    });
  });
});

describe('deleteAccount', () => {
  async function signedInUser() {
    const fake = createFakeSupabase({ session: fakeSession() });
    const view = renderAuthHook(fake);
    await waitFor(() => {
      expect(view.result.current.status).toBe('signed-in');
    });
    return view;
  }

  it('calls delete_my_account with no arguments, then signs out of this device', async () => {
    const { result, fake } = await signedInUser();

    await expect(result.current.deleteAccount()).resolves.toEqual({ ok: true });

    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.rpc).toHaveBeenCalledWith('delete_my_account');
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
    expect(result.current.user).toBeNull();
  });

  it('succeeds even when the local sign-out errors, because the user row is gone', async () => {
    const { result, fake } = await signedInUser();
    fake.signOut.mockResolvedValueOnce({
      error: fakeAuthError('User from sub claim in JWT does not exist', 403),
    });

    await expect(result.current.deleteAccount()).resolves.toEqual({ ok: true });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
  });

  it('succeeds even when the local sign-out rejects', async () => {
    const { result, fake } = await signedInUser();
    fake.signOut.mockRejectedValueOnce(new Error('gone'));

    await expect(result.current.deleteAccount()).resolves.toEqual({ ok: true });
    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });
  });

  it('returns the message and stays signed in when the database refuses', async () => {
    const { result, fake } = await signedInUser();
    fake.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'You must be signed in to delete your account.' },
    });

    await expect(result.current.deleteAccount()).resolves.toEqual({
      ok: false,
      message: 'You must be signed in to delete your account.',
    });
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(result.current.status).toBe('signed-in');
  });

  it('never throws when the call rejects', async () => {
    const { result, fake } = await signedInUser();
    fake.rpc.mockRejectedValueOnce(new Error('network down'));

    await expect(result.current.deleteAccount()).resolves.toMatchObject({
      ok: false,
    });
    expect(result.current.status).toBe('signed-in');
  });
});
