import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { routes } from '@/routes';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { createFakeSupabase, fakeSession } from '@/test/fakeSupabase';

afterEach(() => {
  localStorage.clear();
});

// The real route table and providers: the account disappears while the
// profile page is still on screen, and the visitor must still land on "/".
function renderSignedIn() {
  const fake = createFakeSupabase({ session: fakeSession() });
  const router = createMemoryRouter(routes, { initialEntries: ['/profile'] });
  render(
    <ThemeProvider>
      <AuthProvider client={fake.client}>
        <ProgressProvider client={fake.client}>
          <RouterProvider router={router} />
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
  return { fake, router };
}

describe('Profile with the real providers', () => {
  it('deletes through the rpc, signs out and ends on the home page', async () => {
    const user = userEvent.setup();
    const { fake, router } = renderSignedIn();

    await user.click(
      await screen.findByRole('button', { name: 'Delete my account' }),
    );
    await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await user.click(
      screen.getByRole('button', { name: 'Delete my account forever' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(fake.rpc).toHaveBeenCalledWith('delete_my_account');
    // The header now offers "Sign in": this device is signed out.
    expect(
      await within(screen.getByRole('banner')).findByRole('link', {
        name: 'Sign in',
      }),
    ).toBeInTheDocument();
  });

  it('shows the rpc error and stays signed in on the profile page', async () => {
    const user = userEvent.setup();
    const { fake, router } = renderSignedIn();
    fake.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Could not delete right now.' },
    });

    await user.click(
      await screen.findByRole('button', { name: 'Delete my account' }),
    );
    await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await user.click(
      screen.getByRole('button', { name: 'Delete my account forever' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not delete right now.',
    );
    expect(router.state.location.pathname).toBe('/profile');
    expect(fake.signOut).not.toHaveBeenCalled();
  });
});
