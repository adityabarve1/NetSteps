import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { Lesson } from '@/content/types';
import {
  A,
  B,
  C_UNBUILT,
  defaultLoad,
  loadLessonMock,
  makeLesson,
} from '@/pages/lessonTestKit';
import { noProgressCalls, renderLessonPage } from '@/pages/renderLessonPage';
import { deferred } from '@/test/fakeSupabase';

vi.mock('@/content/curriculum', async () => {
  const kit = await import('@/pages/lessonTestKit');
  return { curriculum: kit.testCurriculum, findLesson: kit.testFindLesson };
});
vi.mock('@/content/loaders', async () => {
  const kit = await import('@/pages/lessonTestKit');
  return { loadLesson: kit.loadLessonMock };
});

const path = (id: string) => `/learn/level-1/${id}`;

beforeEach(() => {
  loadLessonMock.mockReset();
  loadLessonMock.mockImplementation(defaultLoad);
});

describe('loading', () => {
  it('shows a busy status while the lesson loads, and tracks nothing yet', async () => {
    const pending = deferred<Lesson | undefined>();
    loadLessonMock.mockReturnValue(pending.promise);
    const { progress, container } = renderLessonPage(path(A));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading the lesson...');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(noProgressCalls(progress)).toBe(true);
    expect(await axe(container)).toHaveNoViolations();

    await act(async () => {
      pending.resolve(makeLesson(A));
      await pending.promise;
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson A' }),
    ).toBeVisible();
    expect(screen.queryByText('Loading the lesson...')).not.toBeInTheDocument();
  });
});

describe('a lesson that cannot load', () => {
  it('shows the retry state, not "not found", for a built lesson', async () => {
    loadLessonMock.mockResolvedValue(undefined);
    const { progress, container } = renderLessonPage(path(A));

    expect(
      await screen.findByText(
        'We could not load this lesson. Check your connection and try again.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Back to the course map' }),
    ).toHaveAttribute('href', '/learn');
    expect(screen.queryByText('Lesson not found')).not.toBeInTheDocument();
    expect(noProgressCalls(progress)).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Try again loads the lesson again and then shows it', async () => {
    const user = userEvent.setup();
    loadLessonMock.mockResolvedValueOnce(undefined);
    const { progress } = renderLessonPage(path(A));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson A' }),
    ).toBeVisible();
    expect(loadLessonMock).toHaveBeenCalledTimes(2);
    expect(progress.openLesson).toHaveBeenCalledTimes(1);
  });

  it('shows the loading state again while a retry is running', async () => {
    const user = userEvent.setup();
    const retry = deferred<Lesson | undefined>();
    loadLessonMock.mockResolvedValueOnce(undefined);
    loadLessonMock.mockReturnValueOnce(retry.promise);
    renderLessonPage(path(A));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the lesson...',
    );
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      retry.resolve(undefined);
      await retry.promise;
    });
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeVisible();
  });

  it('does not track a lesson whose id differs from the one requested', async () => {
    loadLessonMock.mockResolvedValue(makeLesson(B));
    const { progress } = renderLessonPage(path(A));

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Lesson B' }),
    ).not.toBeInTheDocument();
    expect(noProgressCalls(progress)).toBe(true);
  });
});

describe('navigating while a lesson loads', () => {
  it('renders and tracks only the latest lesson', async () => {
    const slow = deferred<Lesson | undefined>();
    loadLessonMock.mockImplementation((id) =>
      id === A ? slow.promise : defaultLoad(id),
    );
    const { progress, navigateTo } = renderLessonPage(path(A));
    expect(screen.getByRole('status')).toBeVisible();

    navigateTo(path(B));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson B' }),
    ).toBeVisible();
    await act(async () => {
      slow.resolve(makeLesson(A));
      await slow.promise;
    });

    expect(
      screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent),
    ).toEqual(['Lesson B']);
    expect(vi.mocked(progress.openLesson).mock.calls).toEqual([[B]]);
  });

  it('starts a fresh run for the next lesson, so nothing carries over', async () => {
    const user = userEvent.setup();
    const { progress, navigateTo } = renderLessonPage(path(A));
    const sim = await screen.findByRole('group', { name: 'sim-main' });
    await user.click(within(sim).getByRole('button', { name: 'Next' }));

    navigateTo(path(B));
    await screen.findByRole('heading', { level: 1, name: 'Lesson B' });
    for (const [i, pick] of [0, 0, 0, 0, 0].entries()) {
      await user.click(
        screen.getByRole('radio', {
          name: `Option ${String(i + 1)}.${String(pick)}`,
        }),
      );
    }
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));

    // Lesson A's finished simulation must not complete lesson B.
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });
});

describe('a lesson that throws while rendering', () => {
  it('shows a friendly message with a link back and tracks nothing', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error('boom');
    }
    loadLessonMock.mockResolvedValue(makeLesson(A, { tryIt: <Boom /> }));
    const { progress, container } = renderLessonPage(path(A));

    expect(
      await screen.findByText(/Something went wrong in this lesson/),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Back to the course map' }),
    ).toHaveAttribute('href', '/learn');
    expect(progress.openLesson).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
    consoleError.mockRestore();
  });
});

describe('unbuilt lessons in the fixture', () => {
  it('shows "Lesson not found" and never calls the loader for an unbuilt lesson', async () => {
    const { progress } = renderLessonPage(path(C_UNBUILT));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Lesson not found',
      }),
    ).toBeVisible();
    expect(loadLessonMock).not.toHaveBeenCalled();
    expect(noProgressCalls(progress)).toBe(true);
  });
});
