import { describe, expect, it } from 'vitest';
import {
  fixtureGlossary,
  fixtureLesson,
  fixtureMeta,
  fixtureQuestion,
} from '@/test/lessonFixtures';
import type { Lesson, LessonMeta, QuizQuestion } from './types';
import { validateLesson } from './validateLesson';

// Every BAD case breaks exactly one rule and expects exactly one problem back,
// so the test proves that rule fires and that it fires alone.

function problemsFor(
  changes: Partial<Lesson> = {},
  metaChanges: Partial<LessonMeta> = {},
  glossary = fixtureGlossary(),
): string[] {
  return validateLesson(
    { ...fixtureLesson(), ...changes },
    fixtureMeta(metaChanges),
    glossary,
  );
}

function withQuestion(
  index: number,
  change: Partial<QuizQuestion>,
): Lesson['quiz'] {
  return fixtureLesson().quiz.map((q, i) =>
    i === index ? { ...q, ...change } : q,
  );
}

describe('validateLesson: a good lesson', () => {
  it('has no problems', () => {
    expect(problemsFor()).toEqual([]);
  });

  it('accepts the smallest and largest allowed values', () => {
    const recap = fixtureLesson().recap;
    expect(problemsFor({}, { minutes: 8 })).toEqual([]);
    expect(problemsFor({}, { minutes: 30 })).toEqual([]);
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

describe('validateLesson: sections', () => {
  it('flags fewer than 5 sections', () => {
    const sections = fixtureLesson().sections.slice(0, 4);
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(/at least 5 sections.*has 4/),
    ]);
  });

  it('flags a section without a title', () => {
    const sections = fixtureLesson().sections.map((s, i) =>
      i === 3 ? { ...s, title: '  ' } : s,
    );
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(/section 4 .*needs a title/),
    ]);
  });

  it('flags a lesson where no section has a "Go deeper" block', () => {
    const sections = fixtureLesson().sections.map(({ id, title, body }) => ({
      id,
      title,
      body,
    }));
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(/at least one section needs a "Go deeper"/),
    ]);
  });

  it('treats an empty deeper list as no deeper block', () => {
    const sections = fixtureLesson().sections.map((s) => ({
      ...s,
      deeper: [],
    }));
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(/"Go deeper"/),
    ]);
  });

  it('flags a "Go deeper" block without a title', () => {
    const sections = fixtureLesson().sections.map((s, i) =>
      i === 1 ? { ...s, deeper: [{ title: '', body: 'x' }] } : s,
    );
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(/"Go deeper" block .*needs a title/),
    ]);
  });

  it('flags a section without an id, and two sections with the same id', () => {
    const noId = fixtureLesson().sections.map((s, i) =>
      i === 0 ? { ...s, id: '' } : s,
    );
    expect(problemsFor({ sections: noId })).toEqual([
      expect.stringMatching(/section 1 .*needs an id/),
    ]);
    const twice = fixtureLesson().sections.map((s, i) =>
      i === 4 ? { ...s, id: 'section-1' } : s,
    );
    expect(problemsFor({ sections: twice })).toEqual([
      expect.stringMatching(/section id "section-1" is used twice/),
    ]);
  });
});

describe('validateLesson: section anchors', () => {
  it('flags a section id that cannot be used as a link anchor', () => {
    for (const id of ['Not Kebab', 'with_underscore', '-lead', 'a b']) {
      const sections = fixtureLesson().sections.map((s, i) =>
        i === 0 ? { ...s, id } : s,
      );
      expect(problemsFor({ sections }), id).toEqual([
        expect.stringMatching(/section 1: id .* is not kebab-case/),
      ]);
    }
  });
});

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

describe('validateLesson: labs', () => {
  it('flags a lesson with no lab', () => {
    expect(problemsFor({ labs: [] }, { labIds: [] })).toEqual([
      expect.stringMatching(/at least one lab/),
    ]);
  });

  it('flags lab ids that differ from LessonMeta.labIds', () => {
    expect(problemsFor({}, { labIds: ['lab-other'] })).toEqual([
      expect.stringMatching(/lab ids \[lab-fixture\] .*labIds \[lab-other\]/),
    ]);
    expect(problemsFor({}, { labIds: [] })).toEqual([
      expect.stringMatching(/labIds \[\]/),
    ]);
    expect(problemsFor({}, { labIds: ['lab-fixture', 'lab-extra'] })).toEqual([
      expect.stringMatching(/labIds \[lab-fixture, lab-extra\]/),
    ]);
  });

  it('accepts the same lab ids in a different order', () => {
    const labs = [
      { id: 'lab-b', title: 'B', render: () => null },
      { id: 'lab-a', title: 'A', render: () => null },
    ];
    expect(problemsFor({ labs }, { labIds: ['lab-a', 'lab-b'] })).toEqual([]);
  });

  it('flags a lab without a title', () => {
    const labs = [{ id: 'lab-fixture', title: '', render: () => null }];
    expect(problemsFor({ labs })).toEqual([
      expect.stringMatching(/lab "lab-fixture" needs a title/),
    ]);
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

  it('flags minutes outside 8 to 30, including values that are not numbers', () => {
    for (const minutes of [
      7,
      31,
      0,
      -5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(problemsFor({}, { minutes })).toEqual([
        expect.stringMatching(/minutes must be between 8 and 30/),
      ]);
    }
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
