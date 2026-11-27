// Renders one of the auth pages inside a router and an AuthProvider that uses a
// fake Supabase client. Other routes render a stub heading, and the current
// location is always printed so a test can see where a page sent the user.
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '@/auth/AuthProvider';
import AuthCallback from '@/auth/pages/AuthCallback';
import ForgotPassword from '@/auth/pages/ForgotPassword';
import Login from '@/auth/pages/Login';
import ResetPassword from '@/auth/pages/ResetPassword';
import Signup from '@/auth/pages/Signup';
import { createFakeSupabase } from '@/test/fakeSupabase';
import { Elsewhere, Where } from '@/test/probes';
import type { FakeSupabase } from '@/test/fakeSupabase';

export function renderAuthPage(
  path: string,
  fake: FakeSupabase = createFakeSupabase(),
  client: FakeSupabase['client'] | null = fake.client,
) {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { user, fake, ...view };
}
