// Renders useAuth() inside an AuthProvider that uses a fake Supabase client.
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/useAuth';
import { createFakeSupabase } from '@/test/fakeSupabase';
import type { FakeSupabase } from '@/test/fakeSupabase';

export function renderAuthHook(fake: FakeSupabase = createFakeSupabase()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider client={fake.client}>{children}</AuthProvider>
  );
  return { fake, ...renderHook(() => useAuth(), { wrapper }) };
}

/** Same, but waits until the stored session has been read (nobody signed in). */
export async function renderLoadedAuthHook(
  fake: FakeSupabase = createFakeSupabase(),
) {
  const view = renderAuthHook(fake);
  await waitFor(() => {
    expect(view.result.current.status).toBe('signed-out');
  });
  return view;
}
