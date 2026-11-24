import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Layout } from '@/layout/Layout';

// Every page is its own chunk, loaded when its route is first visited. The
// layout renders straight away, so the header and footer never wait for a page.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

// The route table of spec section 9. Pages that need an account go inside the
// pathless <ProtectedRoute /> route: wrapping a lazy route's `element` would not
// work, because the page does not exist until its chunk has loaded.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    // While the first page chunk loads, show the bare shell (its Outlet is
    // empty). Without this React Router warns in development.
    HydrateFallback: Layout,
    children: [
      { index: true, lazy: lazyPage(() => import('@/pages/Landing')) },
      { path: 'login', lazy: lazyPage(() => import('@/auth/pages/Login')) },
      { path: 'signup', lazy: lazyPage(() => import('@/auth/pages/Signup')) },
      {
        path: 'forgot-password',
        lazy: lazyPage(() => import('@/auth/pages/ForgotPassword')),
      },
      {
        path: 'reset-password',
        lazy: lazyPage(() => import('@/auth/pages/ResetPassword')),
      },
      {
        path: 'auth/callback',
        lazy: lazyPage(() => import('@/auth/pages/AuthCallback')),
      },
      { path: 'learn', lazy: lazyPage(() => import('@/pages/CourseMap')) },
      {
        path: 'learn/:levelId/:lessonId',
        lazy: lazyPage(() => import('@/pages/LessonPage')),
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', lazy: lazyPage(() => import('@/pages/Profile')) },
        ],
      },
      { path: 'privacy', lazy: lazyPage(() => import('@/pages/Privacy')) },
      { path: 'terms', lazy: lazyPage(() => import('@/pages/Terms')) },
      { path: '*', lazy: lazyPage(() => import('@/pages/NotFound')) },
    ],
  },
];
