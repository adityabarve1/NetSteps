import { describe, expect, it } from 'vitest';
import { fixtureLesson } from '@/test/lessonFixtures';
import { problemsFor } from './validateLessonTestKit';

describe('validateLesson: a good lesson', () => {
  it('has no problems', () => {
    expect(problemsFor()).toEqual([]);
  });

  it('accepts the smallest and largest allowed values', () => {
    const recap = fixtureLesson().recap;
    expect(problemsFor({}, { minutes: 8 })).toEqual([]);
    expect(problemsFor({}, { minutes: 60 })).toEqual([]);
    expect(
      problemsFor({
        recap: { ...recap, takeaways: ['a', 'b', 'c', 'd', 'e'] },
      }),
    ).toEqual([]);
    expect(
      problemsFor({ recap: { ...recap, takeaways: ['a', 'b', 'c'] } }),
    ).toEqual([]);
  });
});

describe('validateLesson: glossary, simulation, recap and minutes', () => {
  it('flags a glossary id that is not in the glossary', () => {
    expect(problemsFor({ glossary: ['packet', 'no-such-term'] })).toEqual([
      expect.stringMatching(
        /glossary id "no-such-term" is not in the glossary/,
      ),
    ]);
  });

  it('does not mistake object built-ins for glossary terms', () => {
    expect(problemsFor({ glossary: ['constructor'] })).toEqual([
      expect.stringMatching(/glossary id "constructor"/),
    ]);
  });

  it('flags an empty primarySimulationId', () => {
    expect(problemsFor({ primarySimulationId: '' })).toEqual([
      expect.stringMatching(/primarySimulationId/),
    ]);
    expect(problemsFor({ primarySimulationId: '   ' })).toEqual([
      expect.stringMatching(/primarySimulationId/),
    ]);
  });

  it('flags fewer than 3 or more than 5 takeaways', () => {
    const recap = fixtureLesson().recap;
    expect(problemsFor({ recap: { ...recap, takeaways: ['a', 'b'] } })).toEqual(
      [expect.stringMatching(/3 to 5 takeaways.*has 2/)],
    );
    expect(
      problemsFor({
        recap: { ...recap, takeaways: ['a', 'b', 'c', 'd', 'e', 'f'] },
      }),
    ).toEqual([expect.stringMatching(/3 to 5 takeaways.*has 6/)]);
  });

  it('flags an empty one-line summary or an empty takeaway', () => {
    const recap = fixtureLesson().recap;
    expect(problemsFor({ recap: { ...recap, oneLine: '' } })).toEqual([
      expect.stringMatching(/"In one line"/),
    ]);
    expect(
      problemsFor({ recap: { ...recap, takeaways: ['a', ' ', 'c'] } }),
    ).toEqual([expect.stringMatching(/takeaway 2 is empty/)]);
  });

  it('flags minutes outside 8 to 60, including values that are not numbers', () => {
    for (const minutes of [
      7,
      61,
      0,
      -5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(problemsFor({}, { minutes })).toEqual([
        expect.stringMatching(/minutes must be between 8 and 60/),
      ]);
    }
  });

  it('accepts minutes at the 8 and 60 boundaries', () => {
    expect(problemsFor({}, { minutes: 8 })).toEqual([]);
    expect(problemsFor({}, { minutes: 60 })).toEqual([]);
  });

  it('flags an empty hook', () => {
    expect(problemsFor({ hook: ' ' })).toEqual([expect.stringMatching(/hook/)]);
  });

  it('flags a lesson whose id differs from its LessonMeta id', () => {
    expect(problemsFor({ id: 'l1-something-else' })).toEqual([
      expect.stringMatching(/lesson id "l1-something-else" does not match/),
    ]);
  });
});

describe('validateLesson: reporting', () => {
  it('names the lesson in every problem and reports all problems at once', () => {
    const problems = problemsFor(
      { primarySimulationId: '', quiz: [], labs: [] },
      {
        labIds: [],
      },
    );
    expect(problems.length).toBeGreaterThanOrEqual(3);
    for (const problem of problems) {
      expect(problem.startsWith('l1-fixture-lesson: ')).toBe(true);
    }
  });
});
