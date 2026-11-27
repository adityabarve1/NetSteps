import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Quiz } from '@/quiz/Quiz';
import { correctIndexes, fiveQuestions, optionName } from '@/quiz/quizTestKit';

type UserEvent = ReturnType<typeof userEvent.setup>;

async function answer(user: UserEvent, picks: number[]) {
  for (const [i, pick] of picks.entries()) {
    await user.click(
      screen.getByRole('radio', { name: optionName(i + 1, pick) }),
    );
  }
}

const submitButton = () =>
  screen.getByRole('button', { name: 'Submit answers' });
const helperText = 'Answer every question to see your score.';
// Questions 1, 2 and 5 are right; 3 and 4 are wrong.
const mixed = [1, 0, 0, 2, 3];

describe('Quiz while answering', () => {
  it('shows each question as a labelled group of radio options', () => {
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    expect(screen.getAllByRole('group')).toHaveLength(5);
    const first = screen.getByRole('group', { name: /Prompt 1\?/ });
    expect(within(first).getAllByRole('radio')).toHaveLength(4);
    const third = screen.getByRole('group', { name: /Prompt 3\?/ });
    expect(within(third).getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByText('Explanation 1.')).not.toBeInTheDocument();
  });

  it('keeps Submit disabled until every question is answered', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    expect(submitButton()).toBeDisabled();
    await answer(user, [1, 0, 2, 1]);
    expect(submitButton()).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: optionName(5, 3) }));
    expect(submitButton()).toBeEnabled();
  });

  it('explains why Submit is disabled and links the text to the button', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    expect(screen.getByText(helperText)).toBeVisible();
    expect(submitButton()).toHaveAccessibleDescription(helperText);

    await answer(user, correctIndexes);
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
  });

  it('counts answers in a polite status region as the learner goes', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    const counter = screen.getByRole('status');
    expect(counter).toHaveTextContent('0 of 5 answered');
    await answer(user, [1, 0, 2]);
    expect(counter).toHaveTextContent('3 of 5 answered');
    // Changing an answer does not count twice.
    await user.click(screen.getByRole('radio', { name: optionName(1, 3) }));
    expect(counter).toHaveTextContent('3 of 5 answered');
  });

  it('gives every radio group its own name', () => {
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    const names = screen
      .getAllByRole('radio')
      .map((r) => r.getAttribute('name'));
    expect(new Set(names).size).toBe(5);
  });
});

describe('Quiz after Submit', () => {
  it('calls onSubmit once with the score and total', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);

    await answer(user, mixed);
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(3, 5);
  });

  it('scores a perfect attempt', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);

    await answer(user, correctIndexes);
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(5, 5);
    expect(
      screen.getByRole('heading', { name: 'You got 5 of 5' }),
    ).toBeVisible();
  });

  it('shows the score in a status region and moves focus to its heading', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    await answer(user, mixed);
    await user.click(submitButton());

    const heading = screen.getByRole('heading', { name: 'You got 3 of 5' });
    expect(screen.getByRole('status')).toContainElement(heading);
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('shows every explanation with a Correct or Not quite marker', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    await answer(user, mixed);
    await user.click(submitButton());

    for (let n = 1; n <= 5; n++) {
      expect(screen.getByText(`Explanation ${String(n)}.`)).toBeVisible();
    }
    expect(screen.getAllByText('Correct')).toHaveLength(3);
    expect(screen.getAllByText('Not quite')).toHaveLength(2);
  });

  it('names the right answer in words when the learner was wrong', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    await answer(user, mixed);
    await user.click(submitButton());

    const third = screen.getByRole('group', { name: /Prompt 3\?/ });
    expect(third).toHaveTextContent('Not quite');
    expect(third).toHaveTextContent('The correct answer is: Option 3.2');
    const first = screen.getByRole('group', { name: /Prompt 1\?/ });
    expect(first).not.toHaveTextContent('The correct answer is');
  });

  it('makes the answers read-only', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    await answer(user, correctIndexes);
    await user.click(submitButton());

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    expect(screen.getByRole('radio', { name: optionName(1, 1) })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Submit answers' })).toBeNull();
  });
});

describe('Quiz calls onSubmit exactly once per attempt', () => {
  async function ready(onSubmit: (score: number, total: number) => void) {
    const user = userEvent.setup();
    const view = render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);
    await answer(user, correctIndexes);
    const form = view.container.querySelector('form');
    if (!form) throw new Error('The quiz has no form');
    return { user, form };
  }

  it('survives two submit events in the same batch', async () => {
    const onSubmit = vi.fn();
    const { form } = await ready(onSubmit);

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('survives a submit fired from inside onSubmit', async () => {
    let form: HTMLFormElement | null = null;
    const onSubmit = vi.fn(() => {
      if (form && onSubmit.mock.calls.length < 5) fireEvent.submit(form);
    });
    const ctx = await ready(onSubmit);
    form = ctx.form;

    await ctx.user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // The next two tests cannot reach the submittedRef guard: the first accepted
  // submit swaps the Submit button for the result, so the second click or Enter
  // lands on nothing. They still pin what a learner sees. The fireEvent.submit
  // tests above and below exercise the guard itself.
  it('survives a double click', async () => {
    const onSubmit = vi.fn();
    const { user } = await ready(onSubmit);

    await user.dblClick(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('survives Enter pressed twice on the Submit button', async () => {
    const onSubmit = vi.fn();
    const { user } = await ready(onSubmit);

    submitButton().focus();
    await user.keyboard('{Enter}{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores a submit event while a question is unanswered', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Quiz questions={fiveQuestions} onSubmit={onSubmit} />,
    );
    await answer(user, [1, 0]);

    const form = container.querySelector('form');
    if (!form) throw new Error('The quiz has no form');
    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText(/You got/)).not.toBeInTheDocument();
  });
});

describe('Quiz Try again', () => {
  async function submitted(onSubmit = vi.fn()) {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);
    await answer(user, mixed);
    await user.click(submitButton());
    return { user, onSubmit };
  }

  it('clears the answers and the explanations without calling onSubmit', async () => {
    const { user, onSubmit } = await submitted();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeEnabled();
      expect(radio).not.toBeChecked();
    }
    expect(screen.queryByText('Explanation 1.')).not.toBeInTheDocument();
    expect(screen.queryByText(/You got/)).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 5 answered');
  });

  it('moves focus to the first option', async () => {
    const { user } = await submitted();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('radio', { name: optionName(1, 0) })).toHaveFocus();
  });

  it('records the next attempt as a new submit', async () => {
    const { user, onSubmit } = await submitted();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await answer(user, correctIndexes);
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenNthCalledWith(1, 3, 5);
    expect(onSubmit).toHaveBeenNthCalledWith(2, 5, 5);
    expect(
      screen.getByRole('heading', { name: 'You got 5 of 5' }),
    ).toHaveFocus();
  });
});
