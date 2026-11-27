import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QuizQuestion } from '@/content/types';
import { Quiz } from '@/quiz/Quiz';
import { correctIndexes, fiveQuestions, optionName } from '@/quiz/quizTestKit';

// Question ids are only unique inside one lesson, so two lessons can both use
// q1..q5. The quiz must still start fresh when the lesson changes.

const submitButton = () =>
  screen.getByRole('button', { name: 'Submit answers' });

// Same ids as fiveQuestions, different content.
const lessonB: QuizQuestion[] = fiveQuestions.map((q, i) => ({
  ...q,
  prompt: `Lesson B prompt ${String(i + 1)}?`,
  options: q.options.map((o) => `B ${o}`),
  correctIndex: (q.correctIndex + 1) % q.options.length,
  explanation: `Lesson B explanation ${String(i + 1)}.`,
}));

async function submitFirstLesson(onSubmit = vi.fn()) {
  const user = userEvent.setup();
  const view = render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);
  for (const [i, c] of correctIndexes.entries()) {
    await user.click(screen.getByRole('radio', { name: optionName(i + 1, c) }));
  }
  await user.click(submitButton());
  return { user, view, onSubmit };
}

describe('Quiz when another lesson reuses the same question ids', () => {
  it('starts fresh in the same mounted tree', async () => {
    const { user, view } = await submitFirstLesson();
    expect(screen.getByText('You got 5 of 5')).toBeVisible();
    const onSecond = vi.fn();

    view.rerender(<Quiz questions={lessonB} onSubmit={onSecond} />);

    expect(screen.queryByText(/You got/)).not.toBeInTheDocument();
    expect(screen.getByText('Lesson B prompt 1?')).toBeVisible();
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeEnabled();
      expect(radio).not.toBeChecked();
    }
    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 5 answered');

    // The new quiz can be submitted, and reports once for its own questions.
    for (const [i, q] of lessonB.entries()) {
      await user.click(
        screen.getByRole('radio', {
          name: `B ${optionName(i + 1, q.correctIndex)}`,
        }),
      );
    }
    await user.click(submitButton());
    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onSecond).toHaveBeenCalledWith(5, 5);
  });

  it('resets when only a prompt is edited under the same ids', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: optionName(1, 1) }));

    const edited = fiveQuestions.map((q, i) =>
      i === 0 ? { ...q, prompt: 'A reworded first prompt?' } : q,
    );
    rerender(<Quiz questions={edited} onSubmit={vi.fn()} />);

    expect(screen.getByText('A reworded first prompt?')).toBeVisible();
    expect(
      screen.getByRole('radio', { name: optionName(1, 1) }),
    ).not.toBeChecked();
  });

  it('resets when only the correct answer is edited under the same ids', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: optionName(2, 0) }));

    const edited = fiveQuestions.map((q, i) =>
      i === 1 ? { ...q, correctIndex: 3 } : q,
    );
    rerender(<Quiz questions={edited} onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('radio', { name: optionName(2, 0) }),
    ).not.toBeChecked();
  });

  it('resets when only an explanation or an option label is edited', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: optionName(1, 1) }));

    rerender(
      <Quiz
        questions={fiveQuestions.map((q, i) =>
          i === 0 ? { ...q, explanation: 'Reworded.' } : q,
        )}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('radio', { name: optionName(1, 1) }),
    ).not.toBeChecked();

    await user.click(screen.getByRole('radio', { name: optionName(1, 1) }));
    rerender(
      <Quiz
        questions={fiveQuestions.map((q, i) =>
          i === 0
            ? { ...q, explanation: 'Reworded.', options: ['W', 'X', 'Y', 'Z'] }
            : q,
        )}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: 'X' })).not.toBeChecked();
  });

  it('keeps the answers when an identical-content array is rebuilt each render', async () => {
    const user = userEvent.setup();
    const rebuild = () =>
      fiveQuestions.map((q) => ({ ...q, options: [...q.options] }));
    const { rerender } = render(
      <Quiz questions={rebuild()} onSubmit={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: optionName(2, 0) }));

    rerender(<Quiz questions={rebuild()} onSubmit={vi.fn()} />);
    rerender(<Quiz questions={rebuild()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('radio', { name: optionName(2, 0) })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 5 answered');
  });
});
