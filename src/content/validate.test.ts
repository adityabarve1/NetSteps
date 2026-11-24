import { describe, expect, it } from 'vitest';
import { curriculum } from './curriculum';
import { glossary } from './glossary';
import { loadLesson } from './loaders';
import { validateLesson } from './validateLesson';

// Runs the lesson rules (see validateLesson.ts) over every lesson marked built.
// With no built lessons it passes with nothing to check; each Level 1 lesson
// task adds one lesson and from then on it is checked here. The rules themselves
// are proven to fire in validateLesson.test.ts.

const builtLessons = curriculum
  .flatMap((level) => level.lessons)
  .filter((lesson) => lesson.built);

describe('built lessons', () => {
  it('follow the lesson rules', async () => {
    const problems: string[] = [];
    for (const meta of builtLessons) {
      const lesson = await loadLesson(meta.id);
      if (lesson === undefined) {
        problems.push(`${meta.id}: marked built but loadLesson found nothing`);
        continue;
      }
      problems.push(...validateLesson(lesson, meta, glossary));
    }
    // A failure prints the whole list, one problem per line.
    expect(problems).toEqual([]);
  });
});
