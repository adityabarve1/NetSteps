import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { createFakeSupabase, deferred, fakeSession } from '@/test/fakeSupabase';
import type { FakeSupabase } from '@/test/fakeSupabase';
import { Where } from '@/test/probes';

function renderAt(
  path: string,
  fake: FakeSupabase = createFakeSupabase(),
  client: FakeSupabase['client'] | null = fake.client,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={client}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<h1>Private page</h1>} />
            <Route path="/learn/level-1" element={<h1>Private lesson</h1>} />
          </Route>
          <Route path="/login" element={<h1>Login page</h1>} />
        </Routes>
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;

describe('ProtectedRoute', () => {
  it('redirects a signed-out visitor to /login with the page they wanted', async () => {
    renderAt('/profile');

    expect(
      await screen.findByRole('heading', { name: 'Login page' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/login?next=%2Fprofile');
    expect(screen.queryByText('Private page')).not.toBeInTheDocument();
  });

  it('keeps the query string and fragment in next, encoded', async () => {
    renderAt('/learn/level-1?tab=labs#quiz');

    await screen.findByRole('heading', { name: 'Login page' });
    expect(location()).toBe(
      `/login?next=${encodeURIComponent('/learn/level-1?tab=labs#quiz')}`,
    );
  });

  it('shows the page for a signed-in visitor', async () => {
    renderAt('/profile', createFakeSupabase({ session: fakeSession() }));

    expect(
      await screen.findByRole('heading', { name: 'Private page' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/profile');
  });

  it('waits, without redirecting, while the session is being read', async () => {
    const pending = deferred<{ data: { session: null }; error: null }>();
    const fake = createFakeSupabase();
    fake.getSession.mockReturnValueOnce(pending.promise);
    renderAt('/profile', fake);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /checking your sign-in/i,
    );
    expect(location()).toBe('/profile');
    expect(screen.queryByText('Private page')).not.toBeInTheDocument();

    act(() => {
      pending.resolve({ data: { session: null }, error: null });
    });
    expect(
      await screen.findByRole('heading', { name: 'Login page' }),
    ).toBeInTheDocument();
  });

  it('sends the visitor to /login when sign-in is not set up', async () => {
    renderAt('/profile', createFakeSupabase(), null);

    expect(
      await screen.findByRole('heading', { name: 'Login page' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/login?next=%2Fprofile');
  });

  it('closes the page again when the visitor signs out', async () => {
    const fake = createFakeSupabase({ session: fakeSession() });
    renderAt('/profile', fake);
    await screen.findByRole('heading', { name: 'Private page' });

    fake.emit('SIGNED_OUT', null);

    expect(
      await screen.findByRole('heading', { name: 'Login page' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/login?next=%2Fprofile');
  });

  it('also works as a wrapper around its children', async () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <AuthProvider
          client={createFakeSupabase({ session: fakeSession() }).client}
        >
          <ProtectedRoute>
            <h1>Wrapped content</h1>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Wrapped content' }),
    ).toBeInTheDocument();
  });
});
