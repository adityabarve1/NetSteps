import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { siteConfig } from '@/config/site';
import type { Lesson } from '@/content/types';
import {
  A,
  C_UNBUILT,
  defaultLoad,
  loadLessonMock,
  makeLesson,
} from '@/test/lessonTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import { deferred } from '@/test/fakeSupabase';

// Announcing, focus and the browser tab title in the failure, retry, loading
// and not-found states of the lesson page.
vi.mock('@/content/curriculum', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { curriculum: kit.testCurriculum, findLesson: kit.testFindLesson };
});
vi.mock('@/content/loaders', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { loadLesson: kit.loadLessonMock };
});

const path = (id: string) => `/learn/level-1/${id}`;

beforeEach(() => {
  loadLessonMock.mockReset();
  loadLessonMock.mockImplementation(defaultLoad);
});

describe('announcing and focus in the failure and retry states', () => {
  it('announces the failure as an alert', async () => {
    loadLessonMock.mockResolvedValue(undefined);
    renderLessonPage(path(A));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the lesson');
    expect(
      within(alert).getByRole('button', { name: 'Try again' }),
    ).toBeVisible();
  });

  it('moves focus to the loading status when Try again starts a retry', async () => {
    const user = userEvent.setup();
    const retry = deferred<Lesson | undefined>();
    loadLessonMock.mockResolvedValueOnce(undefined);
    loadLessonMock.mockReturnValueOnce(retry.promise);
    renderLessonPage(path(A));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveFocus();
    });
    await act(async () => {
      retry.resolve(undefined);
      await retry.promise;
    });
  });

  it('does not steal focus for the first load', async () => {
    const pending = deferred<Lesson | undefined>();
    loadLessonMock.mockReturnValue(pending.promise);
    renderLessonPage(path(A));

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).not.toHaveFocus();
    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });
  });
});

describe('document title in every state', () => {
  beforeEach(() => {
    document.title = 'Before';
  });

  const title = (text: string) => `${text} - ${siteConfig.name}`;

  it('names a lesson that is not found, and restores the title on unmount', async () => {
    const { unmount } = renderLessonPage(path(C_UNBUILT));
    await screen.findByRole('heading', { name: 'Lesson not found' });
    await waitFor(() => {
      expect(document.title).toBe(title('Lesson not found'));
    });

    unmount();
    expect(document.title).toBe('Before');
  });

  it('names the loading state, then the lesson, then restores', async () => {
    const pending = deferred<Lesson | undefined>();
    loadLessonMock.mockReturnValue(pending.promise);
    const { unmount } = renderLessonPage(path(A));
    await waitFor(() => {
      expect(document.title).toBe(title('Loading the lesson'));
    });

    await act(async () => {
      pending.resolve(makeLesson(A));
      await pending.promise;
    });
    await screen.findByRole('heading', { level: 1, name: 'Lesson A' });
    await waitFor(() => {
      expect(document.title).toBe(title('Lesson A'));
    });

    unmount();
    expect(document.title).toBe('Before');
  });

  it('names the failed state and restores', async () => {
    loadLessonMock.mockResolvedValue(undefined);
    const { unmount } = renderLessonPage(path(A));
    await screen.findByRole('alert');
    await waitFor(() => {
      expect(document.title).toBe(title('Could not load the lesson'));
    });

    unmount();
    expect(document.title).toBe('Before');
  });

  it('names the error screen when a lesson crashes', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error('boom');
    }
    loadLessonMock.mockResolvedValue(makeLesson(A, { tryIt: <Boom /> }));
    const { unmount } = renderLessonPage(path(A));
    await screen.findByText(/Something went wrong in this lesson/);
    await waitFor(() => {
      expect(document.title).toBe(title('Something went wrong'));
    });

    unmount();
    expect(document.title).toBe('Before');
    consoleError.mockRestore();
  });
});
