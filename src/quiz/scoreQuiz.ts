import type { QuizQuestion } from '@/content/types';

export type QuizResult = { score: number; total: number };

// Counts the answers that match each question's correctIndex. Pure and total:
// it never throws and never changes its inputs, whatever it is given.
//   - total is questions.length.
//   - an answer counts only if it is a whole number that equals correctIndex and
//     points at a real option. null, undefined, NaN, fractions, negatives,
//     out-of-range numbers and non-numbers all count as wrong.
//   - a missing answer (a short list or a hole) counts as wrong; extra answers
//     past the last question are ignored.
//   - a question whose correctIndex is not a real option can never be matched.
//     The content validator forbids that, this just keeps scoring safe.
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: (number | null)[],
): QuizResult {
  const given: unknown[] = Array.isArray(answers) ? answers : [];
  let score = 0;
  questions.forEach((question, index) => {
    const answer = given[index];
    if (
      typeof answer === 'number' &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer < question.options.length &&
      answer === question.correctIndex
    ) {
      score += 1;
    }
  });
  return { score, total: questions.length };
}

// True for a whole score from 0 up to a positive whole total. Used to ignore a
// stored "best so far" that is not a believable result.
export function isValidResult(value: unknown): value is QuizResult {
  if (typeof value !== 'object' || value === null) return false;
  const { score, total } = value as Record<string, unknown>;
  return (
    typeof score === 'number' &&
    typeof total === 'number' &&
    Number.isInteger(score) &&
    Number.isInteger(total) &&
    total > 0 &&
    score >= 0 &&
    score <= total
  );
}
