import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lesson } from '@/content/types';
import {
  A,
  B,
  defaultLoad,
  loadLessonMock,
  makeLesson,
} from '@/test/lessonTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import { deferred } from '@/test/fakeSupabase';

// Where focus goes when a lesson finishes loading. The route change has
// already put focus on <main> (the lesson h1 does not exist yet), so the loaded
// lesson moves it to its own h1, unless the learner already moved it somewhere.
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

describe('focus when a lesson has loaded', () => {
  it('moves focus from the page to the lesson heading, without scrolling', async () => {
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    renderLessonPage(path(A));

    const heading = await screen.findByRole('heading', { level: 1 });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it('puts focus on the heading when a retry succeeds', async () => {
    const user = userEvent.setup();
    loadLessonMock.mockResolvedValueOnce(undefined);
    renderLessonPage(path(A));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    const heading = await screen.findByRole('heading', { level: 1 });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it('keeps focus on a control the learner moved to while the lesson loaded', async () => {
    const pending = deferred<Lesson | undefined>();
    loadLessonMock.mockReturnValue(pending.promise);
    renderLessonPage(path(A));
    const skip = document.createElement('button');
    skip.textContent = 'Elsewhere';
    document.body.append(skip);
    skip.focus();

    await act(async () => {
      pending.resolve(makeLesson(A));
      await pending.promise;
    });
    const heading = await screen.findByRole('heading', { level: 1 });

    expect(heading).not.toHaveFocus();
    expect(skip).toHaveFocus();
    skip.remove();
  });

  it('still ends with the heading focused under StrictMode double effects', async () => {
    renderLessonPage(path(A), { strict: true });

    const heading = await screen.findByRole('heading', { level: 1 });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it('focuses the new heading when the learner moves to another lesson', async () => {
    const { navigateTo } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1, name: 'Lesson A' });

    navigateTo(path(B));
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Lesson B',
    });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });
});
