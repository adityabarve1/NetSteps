import type { QuizQuestion } from '@/content/types';

// Five questions with known right answers: [1, 0, 2, 1, 3].
export const correctIndexes = [1, 0, 2, 1, 3];

export function makeQuestion(
  n: number,
  correctIndex: number,
  optionCount = 4,
): QuizQuestion {
  return {
    id: `q${String(n)}`,
    prompt: `Prompt ${String(n)}?`,
    options: Array.from(
      { length: optionCount },
      (_, i) => `Option ${String(n)}.${String(i)}`,
    ),
    correctIndex,
    explanation: `Explanation ${String(n)}.`,
  };
}

export const fiveQuestions: QuizQuestion[] = correctIndexes.map((c, i) =>
  makeQuestion(i + 1, c, i === 2 ? 3 : 4),
);

// The option label of question n (1-based), option i.
export const optionName = (n: number, i: number) =>
  `Option ${String(n)}.${String(i)}`;
