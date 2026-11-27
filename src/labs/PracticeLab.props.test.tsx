import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { PracticeLab } from '@/labs/PracticeLab';
import { generateBinaryDecimal, type Problem } from '@/labs/practice';
import {
  answerBox,
  check,
  currentNumber,
  numberProblem,
  solveCurrent,
  typeAnswer,
} from '@/labs/practiceTestKit';

const ERROR_TEXT = 'Sorry, we could not make a problem. Please try again.';

describe('PracticeLab: bad input and props', () => {
  it('shows a friendly error with a retry when generate throws', async () => {
    const user = userEvent.setup();
    let fail = true;
    const flaky = (rng: () => number) => {
      if (fail) throw new Error('boom');
      return numberProblem(rng);
    };
    render(<PracticeLab generate={flaky} seed={1} />);

    expect(screen.getByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.queryByLabelText('Your answer')).toBeNull();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Problem 1 of 5')).toBeInTheDocument();
  });

  it('shows the same error when generate returns an invalid problem', () => {
    const junk = () => ({ id: 'x' }) as unknown as Problem;
    render(<PracticeLab generate={junk} seed={1} />);
    expect(screen.getByText(ERROR_TEXT)).toBeInTheDocument();
    const nan = (rng: () => number) => ({ ...numberProblem(rng), answer: NaN });
    render(<PracticeLab generate={nan} seed={1} />);
    expect(screen.getAllByText(ERROR_TEXT)).toHaveLength(2);
  });

  it('does not call onDone from the error state', () => {
    const onDone = vi.fn();
    const bad = () => {
      throw new Error('boom');
    };
    render(<PracticeLab generate={bad} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 5],
    [Number.NaN, 5],
    [2.5, 5],
    [0, 1],
    [-3, 1],
    [1, 1],
    [8, 8],
    [20, 20],
    [99, 20],
  ])('count %s gives %s problems', (count, expected) => {
    render(<PracticeLab generate={numberProblem} seed={1} count={count} />);
    expect(
      screen.getByText(`Problem 1 of ${String(expected)}`),
    ).toBeInTheDocument();
  });

  it('starts over when the generate prop changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PracticeLab generate={numberProblem} seed={1} count={3} />,
    );
    await solveCurrent(user);
    expect(screen.getByText('Problem 2 of 3')).toBeInTheDocument();

    rerender(
      <PracticeLab generate={generateBinaryDecimal} seed={1} count={3} />,
    );

    expect(screen.getByText('Problem 1 of 3')).toBeInTheDocument();
    expect(screen.getByText(/binary number/i)).toBeInTheDocument();
    expect(answerBox()).toHaveValue('');
  });

  it('works with the real generators and a number-only answer', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={generateBinaryDecimal} seed={4} count={1} />);
    const bits = /[01]{8}/.exec(
      screen.getByText(/binary number/i).textContent,
    )?.[0];
    await typeAnswer(user, String(Number.parseInt(bits ?? '', 2)));
    await check(user);
    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
  });
});

describe('PracticeLab: accessibility', () => {
  it('has no axe violations in the prompt, wrong, correct and finished states', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PracticeLab generate={numberProblem} seed={1} count={1} />,
    );
    expect(await axe(container)).toHaveNoViolations();

    await typeAnswer(user, '0');
    await check(user);
    expect(await axe(container)).toHaveNoViolations();

    await typeAnswer(user, String(currentNumber()));
    await check(user);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in the error state', async () => {
    const bad = () => {
      throw new Error('boom');
    };
    const { container } = render(<PracticeLab generate={bad} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('announces feedback in a polite status region that exists from the start', () => {
    render(<PracticeLab generate={numberProblem} seed={1} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
