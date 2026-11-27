import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';

// Guards pages that need an account. Used as a pathless layout route, so the
// guarded pages (which load lazily) are its children and show up in its Outlet:
//   { element: <ProtectedRoute />, children: [{ path: 'profile', lazy }] }
// It can also wrap content directly: <ProtectedRoute>...</ProtectedRoute>.
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (status === 'loading') {
    // Wait for the stored session instead of bouncing a signed-in visitor.
    return <p role="status">Checking your sign-in…</p>;
  }
  if (status === 'signed-in') {
    return children ?? <Outlet />;
  }
  // Signed out, or no account service at all: the login page explains which,
  // and sends the visitor back here afterwards.
  const next = encodeURIComponent(`${pathname}${search}${hash}`);
  return <Navigate to={`/login?next=${next}`} replace />;
}
