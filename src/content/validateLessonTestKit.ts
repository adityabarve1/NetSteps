import {
  fixtureGlossary,
  fixtureLesson,
  fixtureMeta,
} from '@/test/lessonFixtures';
import type { Lesson, LessonMeta, QuizQuestion } from './types';
import { validateLesson } from './validateLesson';

// Shared by the validateLesson tests. Every BAD case breaks exactly one rule
// and expects exactly one problem back, so the test proves that rule fires and
// that it fires alone. Not imported by app code.

export function problemsFor(
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

export function withQuestion(
  index: number,
  change: Partial<QuizQuestion>,
): Lesson['quiz'] {
  return fixtureLesson().quiz.map((q, i) =>
    i === index ? { ...q, ...change } : q,
  );
}
