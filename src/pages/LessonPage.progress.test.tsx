import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  A,
  B,
  defaultLoad,
  fakeProgress,
  loadLessonMock,
} from '@/test/lessonTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import type { ProgressState } from '@/progress/types';
import { fiveQuestions } from '@/quiz/quizTestKit';

vi.mock('@/content/curriculum', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { curriculum: kit.testCurriculum, findLesson: kit.testFindLesson };
});
vi.mock('@/content/loaders', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { loadLesson: kit.loadLessonMock };
});

type User = ReturnType<typeof userEvent.setup>;
const path = (id: string) => `/learn/level-1/${id}`;

beforeEach(() => {
  loadLessonMock.mockReset();
  loadLessonMock.mockImplementation(defaultLoad);
});

async function finishSim(user: User, name: string) {
  const sim = await screen.findByRole('group', { name });
  await user.click(within(sim).getByRole('button', { name: 'Next' }));
}

// One pick per question (option index). The right answers are [1, 0, 2, 1, 3].
async function submitQuiz(user: User, picks = [0, 0, 0, 0, 0]) {
  for (const [i, pick] of picks.entries()) {
    await user.click(
      screen.getByRole('radio', {
        name: `Option ${String(i + 1)}.${String(pick)}`,
      }),
    );
  }
  await user.click(screen.getByRole('button', { name: 'Submit answers' }));
}

describe('opening a lesson', () => {
  it('calls openLesson once after the lesson loads', async () => {
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });

    // openLesson runs in an effect, so wait for it instead of racing it.
    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.openLesson).toHaveBeenCalledWith(A);
  });

  it('calls openLesson once under StrictMode', async () => {
    const { progress } = renderLessonPage(path(A), { strict: true });
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    // Let any extra StrictMode effect run settle, then count again.
    await act(async () => {
      await Promise.resolve();
    });
    expect(progress.openLesson).toHaveBeenCalledTimes(1);
  });

  it('does not call it again on clicks or re-renders', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-main');
    await user.click(screen.getByRole('button', { name: /Go deeper/ }));

    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('opens the new lesson, once, after following the next-lesson link', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await user.click(
      await screen.findByRole('link', { name: 'Next: Lesson B' }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Lesson B' });

    await waitFor(() => {
      expect(vi.mocked(progress.openLesson).mock.calls).toEqual([[A], [B]]);
    });
  });
});

describe('completing a lesson', () => {
  it('does not complete when only the primary simulation finished', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-main');

    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('does not complete when only the quiz was submitted, but records the attempt', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });
    await submitQuiz(user);

    expect(progress.submitQuiz).toHaveBeenCalledTimes(1);
    expect(progress.submitQuiz).toHaveBeenCalledWith(A, expect.any(Number), 5);
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('completes once when the simulation finishes first, then the quiz is submitted', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-main');
    await submitQuiz(user);

    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).toHaveBeenCalledWith(A);
  });

  it('completes once when the quiz is submitted first, then the simulation finishes', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });
    await submitQuiz(user);
    expect(progress.completeLesson).not.toHaveBeenCalled();
    await finishSim(user, 'sim-main');

    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
  });

  it('completes once under StrictMode', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A), { strict: true });
    await finishSim(user, 'sim-main');
    await submitQuiz(user);

    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
  });

  it('ignores a simulation that is not the primary one', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-other');
    await submitQuiz(user);

    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('records every quiz attempt but completes only once', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-main');
    await submitQuiz(user);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await submitQuiz(user, [1, 0, 2, 1, 3]);

    expect(progress.submitQuiz).toHaveBeenCalledTimes(2);
    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
  });

  it('counts a quiz score of zero as submitted', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await finishSim(user, 'sim-main');
    await submitQuiz(user, [0, 1, 0, 0, 0]);

    expect(progress.submitQuiz).toHaveBeenCalledWith(A, 0, 5);
    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
  });

  it('does not rewrite completion when the lesson was already completed', async () => {
    const user = userEvent.setup();
    const state: ProgressState = {
      lessons: {
        [A]: {
          status: 'completed',
          lastOpenedAt: '2026-06-01T00:00:00.000Z',
          completedAt: '2026-06-01T00:00:00.000Z',
        },
      },
      labs: {},
    };
    const { progress } = renderLessonPage(path(A), {
      progress: fakeProgress(state),
    });
    await finishSim(user, 'sim-main');
    await submitQuiz(user);

    expect(progress.submitQuiz).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('waits for progress to load before completing', async () => {
    const user = userEvent.setup();
    const loading = fakeProgress(undefined, false);
    const { progress, setProgress } = renderLessonPage(path(A), {
      progress: loading,
    });
    await finishSim(user, 'sim-main');
    await submitQuiz(user);
    expect(progress.completeLesson).not.toHaveBeenCalled();

    // The same fakes, now ready (a new context value, as the provider makes).
    setProgress({ ...loading, ready: true });

    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
    setProgress({ ...loading, ready: true });
    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
  });

  it('shows the learner their best earlier quiz result', async () => {
    const state: ProgressState = {
      lessons: {
        [A]: {
          status: 'in_progress',
          lastOpenedAt: '2026-06-01T00:00:00.000Z',
          quizBest: { score: 4, total: fiveQuestions.length },
        },
      },
      labs: {},
    };
    renderLessonPage(path(A), { progress: fakeProgress(state) });

    expect(await screen.findByText('Your best so far: 4 of 5')).toBeVisible();
  });
});

describe('labs', () => {
  it('calls startLab once, on the first pointer interaction inside the lab', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });
    expect(progress.startLab).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Lab action' }));
    await user.click(screen.getByRole('button', { name: 'Lab action' }));

    expect(progress.startLab).toHaveBeenCalledTimes(1);
    expect(progress.startLab).toHaveBeenCalledWith('lab-main');
  });

  it('calls startLab on a key press inside the lab', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });
    screen.getByRole('button', { name: 'Lab action' }).focus();
    expect(progress.startLab).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');

    expect(progress.startLab).toHaveBeenCalledTimes(1);
  });

  it('ignores navigation and modifier keys when deciding the first interaction', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });
    screen.getByRole('button', { name: 'Lab action' }).focus();

    await user.keyboard('{Tab}');
    screen.getByRole('button', { name: 'Lab action' }).focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    screen.getByRole('button', { name: 'Lab action' }).focus();
    await user.keyboard('{Alt}{Control}{Meta}');
    expect(progress.startLab).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Lab action' }).focus();
    await user.keyboard('a');
    expect(progress.startLab).toHaveBeenCalledTimes(1);
  });

  it('does not start a lab on hover or on interactions outside it', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });

    await user.hover(screen.getByRole('button', { name: 'Lab action' }));
    await user.click(screen.getByRole('button', { name: /Go deeper/ }));

    expect(progress.startLab).not.toHaveBeenCalled();
  });

  it('calls completeLab once even when onDone fires twice, and never completes the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = renderLessonPage(path(A));
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: 'Finish lab twice' }));
    await user.click(screen.getByRole('button', { name: 'Finish lab' }));

    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith('lab-main');
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('gives the lab a labelled group named by its title', async () => {
    renderLessonPage(path(A));

    expect(
      await screen.findByRole('group', { name: 'Main lab' }),
    ).toBeVisible();
  });
});
