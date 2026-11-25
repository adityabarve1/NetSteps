import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '@/content/types';
import { isValidResult, scoreQuiz } from '@/quiz/scoreQuiz';
import {
  correctIndexes,
  fiveQuestions,
  makeQuestion,
} from '@/quiz/quizTestKit';

describe('scoreQuiz', () => {
  it('counts right answers and treats null as wrong', () => {
    expect(scoreQuiz(fiveQuestions, [1, 0, null, 2, 3])).toEqual({
      score: 3,
      total: 5,
    });
  });

  it('gives full marks when every answer is right', () => {
    expect(scoreQuiz(fiveQuestions, correctIndexes)).toEqual({
      score: 5,
      total: 5,
    });
  });

  it('gives 0 when nothing is answered', () => {
    expect(scoreQuiz(fiveQuestions, [null, null, null, null, null])).toEqual({
      score: 0,
      total: 5,
    });
  });

  it('ignores answers beyond the last question', () => {
    expect(scoreQuiz(fiveQuestions, [...correctIndexes, 0, 1, 2])).toEqual({
      score: 5,
      total: 5,
    });
  });

  it('counts questions with no answer slot as wrong', () => {
    expect(scoreQuiz(fiveQuestions, [1, 0])).toEqual({ score: 2, total: 5 });
    expect(scoreQuiz(fiveQuestions, [])).toEqual({ score: 0, total: 5 });
  });

  it('scores an empty quiz as 0 of 0', () => {
    expect(scoreQuiz([], [])).toEqual({ score: 0, total: 0 });
    expect(scoreQuiz([], [1, 2])).toEqual({ score: 0, total: 0 });
  });

  it('counts hostile answers as wrong without throwing', () => {
    const questions = [makeQuestion(1, 1), makeQuestion(2, 0)];
    const hostile: unknown[] = [
      Number.NaN,
      undefined,
      '1',
      1.5,
      -1,
      99,
      Infinity,
      {},
      [1],
      true,
    ];
    for (const bad of hostile) {
      const answers = [bad, bad] as (number | null)[];
      expect(scoreQuiz(questions, answers)).toEqual({ score: 0, total: 2 });
    }
    expect(scoreQuiz(questions, [-0, 0])).toEqual({ score: 1, total: 2 });
  });

  it('survives sparse arrays and a non-array answers value', () => {
    const questions = [makeQuestion(1, 1), makeQuestion(2, 0)];
    // eslint-disable-next-line no-sparse-arrays -- the test needs a hole in the array
    const sparse = [, 0] as unknown as (number | null)[];
    expect(scoreQuiz(questions, sparse)).toEqual({ score: 1, total: 2 });
    expect(
      scoreQuiz(questions, undefined as unknown as (number | null)[]),
    ).toEqual({ score: 0, total: 2 });
  });

  it('can never match a question whose correctIndex is out of range', () => {
    const broken: QuizQuestion[] = [
      makeQuestion(1, 9),
      makeQuestion(2, -1),
      makeQuestion(3, 1.5),
    ];
    expect(scoreQuiz(broken, [9, -1, 1.5])).toEqual({ score: 0, total: 3 });
    expect(scoreQuiz(broken, [0, 0, 1])).toEqual({ score: 0, total: 3 });
  });

  it('does not change its inputs', () => {
    const questions = fiveQuestions.map((q) => ({ ...q }));
    const answers = [1, 0, null, 2, 3];
    const questionsBefore = JSON.stringify(questions);
    scoreQuiz(questions, answers);
    expect(JSON.stringify(questions)).toBe(questionsBefore);
    expect(answers).toEqual([1, 0, null, 2, 3]);
  });

  it('keeps 0 <= score <= total and total === questions.length', () => {
    const inputs: (number | null)[][] = [
      [],
      [null],
      [0, 1, 2, 3, 4, 5, 6],
      [1, 0, 2, 1, 3],
      [3, 3, 3, 3, 3],
      [Number.NaN, -5, 1e9, 1, 0],
    ];
    for (let n = 0; n <= 6; n++) {
      const questions = Array.from({ length: n }, (_, i) =>
        makeQuestion(i + 1, i % 4),
      );
      for (const answers of inputs) {
        const { score, total } = scoreQuiz(questions, answers);
        expect(total).toBe(questions.length);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(total);
        expect(Number.isInteger(score)).toBe(true);
      }
    }
  });
});

describe('isValidResult', () => {
  it('accepts a whole score from 0 up to the total', () => {
    expect(isValidResult({ score: 0, total: 5 })).toBe(true);
    expect(isValidResult({ score: 5, total: 5 })).toBe(true);
    expect(isValidResult({ score: 3, total: 5 })).toBe(true);
  });

  it('rejects anything else', () => {
    const bad: unknown[] = [
      undefined,
      null,
      'x',
      {},
      { score: 1 },
      { score: 1, total: 0 },
      { score: -1, total: 5 },
      { score: 6, total: 5 },
      { score: 1.5, total: 5 },
      { score: Number.NaN, total: 5 },
      { score: 1, total: Infinity },
      { score: '1', total: '5' },
    ];
    for (const value of bad) expect(isValidResult(value)).toBe(false);
  });
});
