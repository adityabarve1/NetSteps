import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PracticeLab } from '@/labs/PracticeLab';
import {
  answerBox,
  check,
  currentNumber,
  numberProblem,
  solveCurrent,
  typeAnswer,
} from '@/labs/practiceTestKit';

const status = () => screen.getByRole('status');

describe('PracticeLab: the first problem', () => {
  it('shows the progress, the prompt and a labelled answer box', () => {
    render(<PracticeLab generate={numberProblem} seed={1} />);

    expect(screen.getByText('Problem 1 of 5')).toBeInTheDocument();
    expect(screen.getByText(/^Type \d+$/)).toBeInTheDocument();
    const box = answerBox();
    expect(box).toHaveAttribute('inputmode', 'decimal');
    expect(box).toHaveAttribute('autocomplete', 'off');
    expect(box).not.toHaveAttribute('type', 'number');
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Next problem' }),
    ).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it('has no heading of its own (the lesson provides it)', () => {
    render(<PracticeLab generate={numberProblem} seed={1} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows the same problems for the same seed', () => {
    const first = render(<PracticeLab generate={numberProblem} seed={11} />);
    const a = currentNumber();
    first.unmount();
    render(<PracticeLab generate={numberProblem} seed={11} />);
    expect(currentNumber()).toBe(a);
  });
});

describe('PracticeLab: a wrong answer', () => {
  it('shows a friendly message and the explanation, and keeps the problem', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    const n = currentNumber();

    await typeAnswer(user, String(n + 1));
    await check(user);

    expect(status()).toHaveTextContent(/try again/i);
    expect(status()).toHaveTextContent(`The answer is ${String(n)} because`);
    expect(currentNumber()).toBe(n);
    expect(screen.getByText('Problem 1 of 5')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next problem' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the typed text, moves focus back to the box and allows a retry', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    const n = currentNumber();

    await typeAnswer(user, String(n + 1));
    await check(user);
    expect(answerBox()).toHaveValue(String(n + 1));
    expect(answerBox()).toHaveFocus();
    expect(answerBox()).not.toHaveAttribute('readonly');

    await typeAnswer(user, String(n));
    await check(user);
    expect(status()).toHaveTextContent(/correct/i);
  });

  it('asks for just a number, without the explanation, when the input is not a number', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);

    await typeAnswer(user, '12 Mbps');
    await check(user);

    expect(status()).toHaveTextContent(/just a number/i);
    expect(status()).not.toHaveTextContent('because the prompt says so');
    expect(answerBox()).toHaveFocus();
  });

  it('treats an empty box as not a number and does not crash', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);

    await check(user);
    expect(status()).toHaveTextContent(/just a number/i);
  });

  it('never reveals the answer in the message line before the explanation', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    await typeAnswer(user, '0');
    await check(user);
    expect(screen.getByText(/try again/i).textContent).not.toContain(
      String(currentNumber()),
    );
  });
});

describe('PracticeLab: a correct answer', () => {
  it('praises, explains, locks the box and focuses Next problem', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    const n = currentNumber();

    await typeAnswer(user, String(n));
    await check(user);

    expect(status()).toHaveTextContent(/correct/i);
    expect(status()).toHaveTextContent(`The answer is ${String(n)} because`);
    expect(answerBox()).toHaveAttribute('readonly');
    const next = screen.getByRole('button', { name: 'Next problem' });
    expect(next).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
  });

  it('moves to the next problem with a fresh box and focus in it', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    const first = currentNumber();

    await solveCurrent(user);

    expect(screen.getByText('Problem 2 of 5')).toBeInTheDocument();
    expect(currentNumber()).not.toBe(first);
    expect(answerBox()).toHaveValue('');
    expect(answerBox()).not.toHaveAttribute('readonly');
    expect(answerBox()).toHaveFocus();
    expect(status()).toBeEmptyDOMElement();
  });

  it('the last problem offers Finish instead of Next problem', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={2} />);

    await solveCurrent(user);
    await typeAnswer(user, String(currentNumber()));
    await check(user);

    expect(screen.getByRole('button', { name: 'Finish' })).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Next problem' }),
    ).not.toBeInTheDocument();
  });

  it('counts a double-click on Check once', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={3} />);
    await typeAnswer(user, String(currentNumber()));

    await user.dblClick(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Next problem' }));

    // Still on problem 2, not skipped to 3.
    expect(screen.getByText('Problem 2 of 3')).toBeInTheDocument();
  });

  it('Enter in the box checks the answer', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);

    await user.type(answerBox(), `${String(currentNumber())}{Enter}`);

    expect(status()).toHaveTextContent(/correct/i);
  });

  it('Enter again after a correct answer does not skip ahead', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} />);
    await user.type(answerBox(), `${String(currentNumber())}{Enter}`);

    await user.click(answerBox());
    await user.keyboard('{Enter}');

    expect(screen.getByText('Problem 1 of 5')).toBeInTheDocument();
  });

  it('can be driven by the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={2} />);

    await user.tab();
    expect(answerBox()).toHaveFocus();
    await user.keyboard(`${String(currentNumber())}{Enter}`);
    expect(screen.getByRole('button', { name: 'Next problem' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Problem 2 of 2')).toBeInTheDocument();
    await user.keyboard(`${String(currentNumber())}{Enter}`);
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: 'Practice again' }),
    ).toBeInTheDocument();
  });
});
