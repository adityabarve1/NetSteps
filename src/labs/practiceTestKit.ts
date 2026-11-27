import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { Problem } from '@/labs/practice';

// A generator whose problems are easy to read in a test: the prompt is
// "Type 123" and the answer is 123. Different draws give different numbers.
export function numberProblem(rng: () => number): Problem {
  const n = 1 + Math.floor(rng() * 100000);
  const text = String(n);
  return {
    id: `n-${text}`,
    prompt: `Type ${text}`,
    answer: n,
    tolerance: 0,
    explanation: `The answer is ${text} because the prompt says so.`,
    params: { n },
  };
}

export const answerBox = () => screen.getByLabelText('Your answer');

// The number in the current "Type N" prompt.
export function currentNumber(): number {
  const node = screen.getByText(/^Type \d+$/);
  return Number(/\d+/.exec(node.textContent)?.[0]);
}

export async function typeAnswer(user: UserEvent, text: string) {
  const box = answerBox();
  await user.clear(box);
  if (text !== '') await user.type(box, text);
}

export async function check(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Check' }));
}

// Answer the current problem correctly and press Next problem / Finish.
export async function solveCurrent(user: UserEvent) {
  await typeAnswer(user, String(currentNumber()));
  await check(user);
  const next =
    screen.queryByRole('button', { name: 'Next problem' }) ??
    screen.getByRole('button', { name: 'Finish' });
  await user.click(next);
}
