import { StrictMode, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PracticeLab } from '@/labs/PracticeLab';
import type { Problem } from '@/labs/practice';
import {
  answerBox,
  check,
  currentNumber,
  numberProblem,
  solveCurrent,
  typeAnswer,
} from '@/labs/practiceTestKit';

async function finishAll(user: ReturnType<typeof userEvent.setup>, n: number) {
  for (let i = 0; i < n; i += 1) await solveCurrent(user);
}

describe('PracticeLab: finishing', () => {
  it('shows a wrap-up and calls onDone once', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <PracticeLab
        generate={numberProblem}
        seed={1}
        count={3}
        onDone={onDone}
      />,
    );

    await finishAll(user, 2);
    expect(onDone).not.toHaveBeenCalled();
    await finishAll(user, 1);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'You finished 3 problems. 3 were right on the first try.',
    );
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Practice again' }),
    ).toHaveFocus();
  });

  it('counts only first-try answers in the wrap-up', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={2} />);

    await typeAnswer(user, '0');
    await check(user);
    await check(user);
    await solveCurrent(user);
    await solveCurrent(user);

    expect(screen.getByRole('status')).toHaveTextContent(
      'You finished 2 problems. 1 was right on the first try.',
    );
  });

  it('does not count a solved problem again when Enter is pressed in the locked box', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={2} />);
    await user.type(answerBox(), `${String(currentNumber())}{Enter}`);
    await user.click(answerBox());
    await user.keyboard('{Enter}{Enter}');
    await user.click(screen.getByRole('button', { name: 'Next problem' }));
    await solveCurrent(user);

    expect(screen.getByRole('status')).toHaveTextContent(
      'You finished 2 problems. 2 were right on the first try.',
    );
  });

  it('works without an onDone', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={1} count={1} />);
    await finishAll(user, 1);
    expect(
      screen.getByRole('button', { name: 'Practice again' }),
    ).toBeVisible();
  });

  it('calls onDone once under a StrictMode root', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <StrictMode>
        <PracticeLab
          generate={numberProblem}
          seed={1}
          count={2}
          onDone={onDone}
        />
      </StrictMode>,
    );
    await finishAll(user, 2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('calls the latest onDone once even when its identity changes', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <PracticeLab
        generate={numberProblem}
        seed={1}
        count={2}
        onDone={first}
      />,
    );
    await finishAll(user, 1);
    rerender(
      <PracticeLab
        generate={numberProblem}
        seed={1}
        count={2}
        onDone={second}
      />,
    );
    await finishAll(user, 1);
    rerender(
      <PracticeLab
        generate={numberProblem}
        seed={1}
        count={2}
        onDone={vi.fn()}
      />,
    );

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not call onDone again on a re-render', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    function Parent() {
      const [n, setN] = useState(0);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setN(n + 1);
            }}
          >
            poke {n}
          </button>
          <PracticeLab
            generate={numberProblem}
            seed={1}
            count={1}
            onDone={onDone}
          />
        </>
      );
    }
    render(<Parent />);
    await finishAll(user, 1);
    await user.click(screen.getByRole('button', { name: /poke/ }));
    await user.click(screen.getByRole('button', { name: /poke/ }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('PracticeLab: Practice again', () => {
  it('starts a new session with new problems and does not call onDone again', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <PracticeLab
        generate={numberProblem}
        seed={1}
        count={2}
        onDone={onDone}
      />,
    );
    const firstSession = currentNumber();
    await finishAll(user, 2);
    expect(onDone).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Practice again' }));

    expect(screen.getByText('Problem 1 of 2')).toBeInTheDocument();
    expect(currentNumber()).not.toBe(firstSession);
    expect(answerBox()).toHaveValue('');

    await finishAll(user, 2);
    expect(
      screen.getByRole('button', { name: 'Practice again' }),
    ).toBeVisible();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('gives different problems in every new session', async () => {
    const user = userEvent.setup();
    render(<PracticeLab generate={numberProblem} seed={5} count={3} />);
    const seen: number[][] = [];
    for (let round = 0; round < 3; round += 1) {
      const session: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        session.push(currentNumber());
        await solveCurrent(user);
      }
      seen.push(session);
      await user.click(screen.getByRole('button', { name: 'Practice again' }));
    }
    expect(new Set(seen.map((s) => s.join())).size).toBe(3);
  });

  it('never repeats a problem within one session', async () => {
    const user = userEvent.setup();
    const small = (rng: () => number): Problem => {
      const n = 1 + Math.floor(rng() * 4);
      return {
        id: `s-${String(n)}`,
        prompt: `Type ${String(n)}`,
        answer: n,
        tolerance: 0,
        explanation: 'e',
        params: { n },
      };
    };
    render(<PracticeLab generate={small} seed={3} count={4} />);
    const seen: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      seen.push(currentNumber());
      await solveCurrent(user);
    }
    expect(new Set(seen).size).toBe(4);
  });
});
