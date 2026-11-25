import { describe, expect, it } from 'vitest';
import { fixtureLesson, fixtureQuestion } from '@/test/lessonFixtures';
import { problemsFor, withQuestion } from './validateLessonTestKit';

describe('validateLesson: quiz', () => {
  it('flags a quiz that does not have exactly 5 questions', () => {
    expect(problemsFor({ quiz: fixtureLesson().quiz.slice(0, 4) })).toEqual([
      expect.stringMatching(/exactly 5 .*has 4/),
    ]);
    expect(
      problemsFor({ quiz: [...fixtureLesson().quiz, fixtureQuestion(6)] }),
    ).toEqual([expect.stringMatching(/exactly 5 .*has 6/)]);
  });

  it('flags a correctIndex outside the options', () => {
    for (const correctIndex of [3, -1, 1.5, Number.NaN]) {
      expect(problemsFor({ quiz: withQuestion(2, { correctIndex }) })).toEqual([
        expect.stringMatching(/question 3: correctIndex/),
      ]);
    }
  });

  it('flags an empty explanation', () => {
    expect(
      problemsFor({ quiz: withQuestion(0, { explanation: ' ' }) }),
    ).toEqual([expect.stringMatching(/question 1 .*needs an explanation/)]);
  });

  it('flags an empty prompt, an empty option and the wrong option count', () => {
    expect(problemsFor({ quiz: withQuestion(1, { prompt: '' }) })).toEqual([
      expect.stringMatching(/question 2 .*needs a prompt/),
    ]);
    expect(
      problemsFor({ quiz: withQuestion(1, { options: ['A', '', 'C'] }) }),
    ).toEqual([expect.stringMatching(/question 2: option 2 is empty/)]);
    expect(
      problemsFor({
        quiz: withQuestion(4, { options: ['A', 'B'], correctIndex: 0 }),
      }),
    ).toEqual([expect.stringMatching(/question 5 needs 3 or 4 options/)]);
  });

  it('flags two questions with the same id', () => {
    expect(problemsFor({ quiz: withQuestion(3, { id: 'q1' }) })).toEqual([
      expect.stringMatching(/quiz question id "q1" is used twice/),
    ]);
  });
});
