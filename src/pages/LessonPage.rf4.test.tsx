// RF4 with the REAL curriculum and loaders (nothing is mocked here): a lesson
// route whose ids do not name a built lesson shows "Lesson not found" and never
// touches progress. The positive control opens a real built lesson and checks
// that it DOES write progress, so the negative cases cannot pass by accident.
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AuthProvider } from '@/auth/AuthProvider';
import { findLesson } from '@/content/curriculum';
import { GUEST_STORAGE_KEY } from '@/progress/localStore';
import { ProgressProvider } from '@/progress/ProgressProvider';
import { routes } from '@/routes';
import { createFakeSupabase } from '@/test/fakeSupabase';
import { ThemeProvider } from '@/theme/ThemeProvider';

afterEach(() => {
  localStorage.clear();
});

function renderAt(path: string) {
  const fake = createFakeSupabase();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <ThemeProvider>
      <AuthProvider client={fake.client}>
        <ProgressProvider client={fake.client}>
          <RouterProvider router={router} />
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
  return { fake, ...view };
}

const cases: [string, string][] = [
  ['an unknown level and lesson', '/learn/level-9/x'],
  [
    'a real lesson that is not built yet',
    '/learn/level-2/l2-ethernet-and-mac-addresses',
  ],
  [
    'a real lesson under the wrong level',
    '/learn/level-1/l2-ethernet-and-mac-addresses',
  ],
  ['a lesson id that is a prototype key', '/learn/level-1/constructor'],
];

describe('lesson route guard (real curriculum)', () => {
  it('the exact lessons used below exist or not, as the tests assume', () => {
    expect(findLesson('level-2', 'l2-ethernet-and-mac-addresses')?.built).toBe(
      false,
    );
    expect(findLesson('level-1', 'l2-ethernet-and-mac-addresses')).toBe(
      undefined,
    );
    expect(findLesson('level-1', 'l1-what-is-a-network')?.built).toBe(true);
  });

  it('positive control: a built lesson loads and records that it was opened', async () => {
    renderAt('/learn/level-1/l1-what-is-a-network');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'What is a network' },
        { timeout: 15000 },
      ),
    ).toBeVisible();
    await waitFor(() => {
      expect(localStorage.getItem(GUEST_STORAGE_KEY)).toContain(
        'l1-what-is-a-network',
      );
    });
  });

  it.each(cases)(
    'shows "Lesson not found" for %s, and writes nothing',
    async (_name, path) => {
      const { container } = renderAt(path);

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Lesson not found',
        }),
      ).toBeVisible();
      expect(
        screen.getByText(
          'That lesson is not available yet, or the link is wrong.',
        ),
      ).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'Back to the course map' }),
      ).toHaveAttribute('href', '/learn');
      expect(localStorage.length).toBe(0);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
