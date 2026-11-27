import { describe, expect, it } from 'vitest';
import { problemsFor } from './validateLessonTestKit';

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

  it('flags two labs that share an id, once', () => {
    const labs = [
      { id: 'lab-a', title: 'A', render: () => null },
      { id: 'lab-a', title: 'A again', render: () => null },
      { id: 'lab-b', title: 'B', render: () => null },
    ];
    expect(
      problemsFor({ labs }, { labIds: ['lab-a', 'lab-a', 'lab-b'] }),
    ).toEqual([expect.stringMatching(/lab id "lab-a" is used twice/)]);
  });
});
