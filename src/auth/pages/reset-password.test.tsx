import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
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

describe('ResetPassword page', () => {
  const recoverySession = () => createFakeSupabase({ session: fakeSession() });

  // A recovery link puts type=recovery in the address bar before the library
  // turns it into a session and clears it.
  async function openWithRecovery() {
    window.location.hash = '#access_token=abc&type=recovery';
    const fake = recoverySession();
    const view = renderAuthPage('/reset-password', fake);
    await screen.findByLabelText('New password');
    return { ...view, fake };
  }

  it('shows the new-password form when a recovery event has arrived', async () => {
    const fake = recoverySession();
    renderAuthPage('/reset-password', fake);
    await screen.findByText(/checking your link|this link has expired/i);

    fake.emit('PASSWORD_RECOVERY', fakeSession());

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Choose a new password',
      }),
    ).toBeInTheDocument();
    const password = screen.getByLabelText('New password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('shows the form straight away for a recovery link in the address bar', async () => {
    window.location.hash = '#access_token=abc&type=recovery';
    renderAuthPage('/reset-password', recoverySession());

    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(screen.queryByText(/has expired/i)).not.toBeInTheDocument();
  });

  it('says the link has expired, and offers a new one, when there is no session', async () => {
    renderAuthPage('/reset-password');

    expect(
      await screen.findByText(/this link has expired/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Choose a new password' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /ask for a new link/i }),
    ).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('says the link has expired for a plain signed-in visit with no recovery', async () => {
    renderAuthPage(
      '/reset-password',
      createFakeSupabase({ session: fakeSession() }),
    );

    expect(
      await screen.findByText(/this link has expired/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('waits while the session is still loading instead of flashing "expired"', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    renderAuthPage('/reset-password', fake);

    expect(await screen.findByText(/checking your link/i)).toBeInTheDocument();
    expect(screen.queryByText(/has expired/i)).not.toBeInTheDocument();

    act(() => {
      pending.resolve({ data: { session: null }, error: null });
    });
    expect(
      await screen.findByText(/this link has expired/i),
    ).toBeInTheDocument();
  });

  it('saves a new password, then offers to continue', async () => {
    const { user, fake } = await openWithRecovery();
    await user.type(screen.getByLabelText('New password'), 'a brand new one');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'a brand new one',
    );
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /password has been changed/i,
    );
    expect(fake.updateUser).toHaveBeenCalledWith({
      password: 'a brand new one',
    });
    expect(
      screen.getByRole('link', { name: /continue learning/i }),
    ).toHaveAttribute('href', '/learn');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.queryByText(/has expired/i)).not.toBeInTheDocument();
  });

  it('rejects a password under 8 characters without calling Supabase', async () => {
    const { user, fake } = await openWithRecovery();
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /at least 8 characters/i,
    );
    expect(screen.getByLabelText('New password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fake.updateUser).not.toHaveBeenCalled();
  });

  it('rejects two passwords that do not match without calling Supabase', async () => {
    const { user, fake } = await openWithRecovery();
    await user.type(screen.getByLabelText('New password'), 'a brand new one');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'a brand new 0ne',
    );
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fake.updateUser).not.toHaveBeenCalled();
  });

  it('shows the Supabase message when saving fails', async () => {
    const { user, fake } = await openWithRecovery();
    fake.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: fakeAuthError(
        'New password should be different from the old password.',
        422,
      ),
    });
    await user.type(screen.getByLabelText('New password'), 'same as before');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'same as before',
    );
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'New password should be different from the old password.',
    );
    expect(
      screen.getByRole('button', { name: 'Save new password' }),
    ).toBeEnabled();
  });

  it('disables the button while saving and sends it only once', async () => {
    const { user, fake } = await openWithRecovery();
    const pending = deferred<{ data: { user: null }; error: null }>();
    fake.updateUser.mockReturnValueOnce(pending.promise);
    await user.type(screen.getByLabelText('New password'), 'a brand new one');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'a brand new one{Enter}',
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(fake.updateUser).toHaveBeenCalledTimes(1);

    act(() => {
      pending.resolve({ data: { user: null }, error: null });
    });
    await screen.findByRole('status');
  });

  it('says sign-in is not set up when unconfigured', async () => {
    renderAuthPage('/reset-password', createFakeSupabase(), null);

    expect(
      await screen.findByText(/Sign-in isn't set up yet/),
    ).toBeInTheDocument();
  });

  it('has no axe violations in the form, or in the expired state', async () => {
    const form = await openWithRecovery();
    expect(await axe(form.container)).toHaveNoViolations();
    form.unmount();

    window.location.hash = '';
    const expired = renderAuthPage('/reset-password');
    await screen.findByText(/this link has expired/i);
    expect(await axe(expired.container)).toHaveNoViolations();
  });
});
