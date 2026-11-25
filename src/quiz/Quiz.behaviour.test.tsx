import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Quiz } from '@/quiz/Quiz';
import {
  correctIndexes,
  fiveQuestions,
  makeQuestion,
  optionName,
} from '@/quiz/quizTestKit';

type UserEvent = ReturnType<typeof userEvent.setup>;

const submitButton = () =>
  screen.getByRole('button', { name: 'Submit answers' });
const radio = (n: number, i: number) =>
  screen.getByRole('radio', { name: optionName(n, i) });

async function answerAll(user: UserEvent, picks: number[]) {
  for (const [i, pick] of picks.entries()) await user.click(radio(i + 1, pick));
}

const otherLesson = fiveQuestions.map((q) => ({ ...q, id: `other-${q.id}` }));

describe('Quiz previousBest', () => {
  it('shows a valid best result', () => {
    render(
      <Quiz
        questions={fiveQuestions}
        onSubmit={vi.fn()}
        previousBest={{ score: 4, total: 5 }}
      />,
    );

    expect(screen.getByText('Your best so far: 4 of 5')).toBeVisible();
  });

  it('shows nothing when there is no previous best', () => {
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    expect(screen.queryByText(/best so far/)).not.toBeInTheDocument();
  });

  it.each([
    { score: 6, total: 5 },
    { score: -1, total: 5 },
    { score: 1, total: 0 },
    { score: 1.5, total: 5 },
    { score: Number.NaN, total: 5 },
    { score: 2, total: Infinity },
  ])('ignores the invalid best %o without a word', (best) => {
    render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} previousBest={best} />,
    );

    expect(screen.queryByText(/best so far/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still shows it after a submit', async () => {
    const user = userEvent.setup();
    render(
      <Quiz
        questions={fiveQuestions}
        onSubmit={vi.fn()}
        previousBest={{ score: 2, total: 5 }}
      />,
    );
    await answerAll(user, correctIndexes);
    await user.click(submitButton());

    expect(screen.getByText('Your best so far: 2 of 5')).toBeVisible();
  });
});

describe('Quiz with odd questions', () => {
  it('shows a friendly message and no Submit when there are no questions', () => {
    const onSubmit = vi.fn();
    render(<Quiz questions={[]} onSubmit={onSubmit} />);

    expect(screen.getByText('No quiz questions yet')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not crash on questions with too few options or a bad correctIndex', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Quiz
        questions={[
          makeQuestion(1, 0, 1),
          makeQuestion(2, 7, 3),
          makeQuestion(3, 0, 0),
        ]}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getAllByRole('group')).toHaveLength(3);
    // The question with no options cannot be answered, so it is not required.
    await user.click(radio(1, 0));
    await user.click(radio(2, 1));
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(1, 3);
    expect(screen.getByRole('group', { name: /Prompt 2\?/ })).toHaveTextContent(
      'Not quite',
    );
  });
});

describe('Quiz when the questions change', () => {
  it('starts fresh when the lesson (the question ids) changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await user.click(radio(1, 1));
    expect(radio(1, 1)).toBeChecked();

    rerender(<Quiz questions={otherLesson} onSubmit={vi.fn()} />);

    expect(radio(1, 1)).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 5 answered');
  });

  it('drops a submitted result when the lesson changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await answerAll(user, correctIndexes);
    await user.click(submitButton());

    rerender(<Quiz questions={otherLesson} onSubmit={vi.fn()} />);

    expect(screen.queryByText(/You got/)).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('keeps the answers when the same questions are passed again', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await user.click(radio(2, 0));

    rerender(<Quiz questions={[...fiveQuestions]} onSubmit={vi.fn()} />);

    expect(radio(2, 0)).toBeChecked();
  });

  it('uses the newest onSubmit callback', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Quiz questions={fiveQuestions} onSubmit={first} />,
    );
    rerender(<Quiz questions={fiveQuestions} onSubmit={second} />);
    await answerAll(user, correctIndexes);
    await user.click(submitButton());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(5, 5);
  });
});

describe('Quiz on a page with two quizzes', () => {
  it('does not share radio groups or answers', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />
        <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />
      </>,
    );

    const both = screen.getAllByRole('radio', { name: optionName(1, 1) });
    const [a, b] = both as [HTMLElement, HTMLElement];
    await user.click(a);
    await user.click(b);

    // Different groups: ticking the second does not untick the first.
    expect(a).toBeChecked();
    expect(b).toBeChecked();
    expect(a.getAttribute('name')).not.toBe(b.getAttribute('name'));
  });
});

describe('Quiz keyboard use', () => {
  it('Tab enters a group, arrows move through the options and Space selects', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);

    await user.tab();
    expect(radio(1, 0)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(radio(1, 1)).toHaveFocus();
    expect(radio(1, 1)).toBeChecked();
    await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}');
    expect(radio(1, 0)).toBeChecked();
    await user.tab();
    expect(radio(2, 0)).toHaveFocus();
    await user.keyboard(' ');
    expect(radio(2, 0)).toBeChecked();
  });

  it('can answer, submit and try again without a mouse', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={onSubmit} />);

    for (let n = 1; n <= 5; n++) {
      await user.tab();
      await user.keyboard(' ');
    }
    await user.tab();
    expect(submitButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    // Option 0 everywhere: only question 2 has 0 as its right answer.
    expect(onSubmit).toHaveBeenCalledWith(1, 5);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(radio(1, 0)).toHaveFocus();
  });
});

describe('Quiz accessibility', () => {
  it('has no axe violations while answering', async () => {
    const { container } = render(
      <Quiz
        questions={fiveQuestions}
        onSubmit={vi.fn()}
        previousBest={{ score: 3, total: 5 }}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations once submitted', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Quiz questions={fiveQuestions} onSubmit={vi.fn()} />,
    );
    await answerAll(user, [1, 0, 0, 2, 3]);
    await user.click(submitButton());

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with no questions', async () => {
    const { container } = render(<Quiz questions={[]} onSubmit={vi.fn()} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Quiz result announcement', () => {
  it('keeps only the heading and message in the status region', async () => {
    const user = userEvent.setup();
    render(<Quiz questions={fiveQuestions} onSubmit={vi.fn()} />);
    await answerAll(user, correctIndexes);
    await user.click(submitButton());

    const tryAgain = screen.getByRole('button', { name: 'Try again' });
    const regions = screen.getAllByRole('status');
    const result = regions.find((el) => el.textContent.includes('You got 5'));
    expect(result).toBeDefined();
    expect(result?.textContent).toContain('Well done');
    expect(result?.contains(tryAgain)).toBe(false);
    for (const region of regions) expect(region.contains(tryAgain)).toBe(false);
  });
});
