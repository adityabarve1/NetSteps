import { describe, expect, it } from 'vitest';
import { fixtureLesson } from '@/test/lessonFixtures';
import { problemsFor } from './validateLessonTestKit';

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

describe('validateLesson: ids the lesson page reserves', () => {
  it.each([
    'try-it',
    'practice-lab',
    'on-your-computer',
    'why-it-matters',
    'check-yourself',
    'recap',
  ])('flags a lesson section whose id is the fixed page id "%s"', (id) => {
    const sections = fixtureLesson().sections.map((s, i) =>
      i === 2 ? { ...s, id } : s,
    );
    expect(problemsFor({ sections })).toEqual([
      expect.stringMatching(
        new RegExp(`section 3: id "${id}" is reserved by the lesson page`),
      ),
    ]);
  });
});
