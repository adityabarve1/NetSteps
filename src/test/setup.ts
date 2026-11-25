import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// A developer's .env.local holds a real Supabase project. No test may reach it,
// so the client always sees "not configured" unless a test injects a fake.
vi.stubEnv('VITE_SUPABASE_URL', '');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

afterEach(() => {
  cleanup();
});

// axe-core probes canvas for color-contrast checks and jsdom logs a noisy
// "not implemented" error for it. Report "no canvas support" instead.
if (typeof HTMLCanvasElement !== 'undefined') {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => null,
  );
}

// jsdom does not implement matchMedia. Default to "no query matches"; tests
// that need a match override window.matchMedia themselves.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): Partial<MediaQueryList> => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }),
  });
}

// jsdom does not implement scrolling and prints "not implemented" when a page
// scrolls (ScrollRestoration does on every navigation). Do nothing instead.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}
