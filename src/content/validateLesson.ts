import { lookupTerm } from './glossary/lookup';
import { isKebabCase } from './kebab';
import type { Glossary, Lesson, LessonMeta } from './types';

// The rules every built lesson must follow (spec section 7 and the lesson
// recipe in the netsteps-coding skill). Pure: no React, no clock, no network.
// Returns one readable sentence per problem and an empty list for a good lesson.

const MIN_SECTIONS = 5;
const QUIZ_LENGTH = 5;
const MIN_OPTIONS = 3;
const MAX_OPTIONS = 4;
const MIN_TAKEAWAYS = 3;
const MAX_TAKEAWAYS = 5;
const MIN_MINUTES = 8;
const MAX_MINUTES = 30;

const blank = (text: string) => text.trim() === '';

function sectionProblems(lesson: Lesson): string[] {
  const problems: string[] = [];
  if (lesson.sections.length < MIN_SECTIONS) {
    problems.push(
      `needs at least ${String(MIN_SECTIONS)} sections, has ${String(lesson.sections.length)}`,
    );
  }
  const seen = new Set<string>();
  lesson.sections.forEach((section, i) => {
    const label = `section ${String(i + 1)}`;
    if (blank(section.id)) {
      problems.push(`${label} needs an id`);
    } else {
      if (!isKebabCase(section.id)) {
        problems.push(`${label}: id "${section.id}" is not kebab-case`);
      }
      if (seen.has(section.id)) {
        problems.push(`section id "${section.id}" is used twice`);
      }
      seen.add(section.id);
    }
    if (blank(section.title)) problems.push(`${label} needs a title`);
    section.deeper?.forEach((block, j) => {
      if (blank(block.title)) {
        problems.push(
          `${label}: "Go deeper" block ${String(j + 1)} needs a title`,
        );
      }
    });
  });
  if (!lesson.sections.some((s) => (s.deeper?.length ?? 0) > 0)) {
    problems.push('at least one section needs a "Go deeper" block');
  }
  return problems;
}

function quizProblems(lesson: Lesson): string[] {
  const problems: string[] = [];
  if (lesson.quiz.length !== QUIZ_LENGTH) {
    problems.push(
      `the quiz needs exactly ${String(QUIZ_LENGTH)} questions, has ${String(lesson.quiz.length)}`,
    );
  }
  const seen = new Set<string>();
  lesson.quiz.forEach((q, i) => {
    const label = `quiz question ${String(i + 1)}`;
    if (seen.has(q.id))
      problems.push(`quiz question id "${q.id}" is used twice`);
    seen.add(q.id);
    if (blank(q.prompt)) problems.push(`${label} needs a prompt`);
    if (q.options.length < MIN_OPTIONS || q.options.length > MAX_OPTIONS) {
      problems.push(
        `${label} needs ${String(MIN_OPTIONS)} or ${String(MAX_OPTIONS)} options, has ${String(q.options.length)}`,
      );
    }
    q.options.forEach((option, j) => {
      if (blank(option))
        problems.push(`${label}: option ${String(j + 1)} is empty`);
    });
    if (
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.options.length
    ) {
      problems.push(
        `${label}: correctIndex ${String(q.correctIndex)} is not one of the ${String(q.options.length)} options`,
      );
    }
    if (blank(q.explanation)) problems.push(`${label} needs an explanation`);
  });
  return problems;
}

function labProblems(lesson: Lesson, meta: LessonMeta): string[] {
  const problems: string[] = [];
  if (lesson.labs.length < 1) problems.push('needs at least one lab');
  for (const lab of lesson.labs) {
    if (blank(lab.title)) problems.push(`lab "${lab.id}" needs a title`);
  }
  const labIds = lesson.labs.map((lab) => lab.id);
  const sorted = (ids: string[]) =>
    [...ids].sort((a, b) => a.localeCompare(b)).join('\n');
  if (sorted(labIds) !== sorted(meta.labIds)) {
    problems.push(
      `lab ids [${labIds.join(', ')}] must equal LessonMeta.labIds [${meta.labIds.join(', ')}]`,
    );
  }
  return problems;
}

function recapProblems(lesson: Lesson): string[] {
  const problems: string[] = [];
  const { oneLine, takeaways } = lesson.recap;
  if (blank(oneLine))
    problems.push('the recap needs an "In one line" sentence');
  if (takeaways.length < MIN_TAKEAWAYS || takeaways.length > MAX_TAKEAWAYS) {
    problems.push(
      `the recap needs ${String(MIN_TAKEAWAYS)} to ${String(MAX_TAKEAWAYS)} takeaways, has ${String(takeaways.length)}`,
    );
  }
  takeaways.forEach((takeaway, i) => {
    if (blank(takeaway)) problems.push(`takeaway ${String(i + 1)} is empty`);
  });
  return problems;
}

export function validateLesson(
  lesson: Lesson,
  meta: LessonMeta,
  glossary: Glossary,
): string[] {
  const problems: string[] = [];
  if (lesson.id !== meta.id) {
    problems.push(`lesson id "${lesson.id}" does not match the curriculum id`);
  }
  if (blank(lesson.hook)) problems.push('needs a hook');
  if (blank(lesson.primarySimulationId)) {
    problems.push('needs a primarySimulationId');
  }
  if (!(meta.minutes >= MIN_MINUTES && meta.minutes <= MAX_MINUTES)) {
    problems.push(
      `minutes must be between ${String(MIN_MINUTES)} and ${String(MAX_MINUTES)}, is ${String(meta.minutes)}`,
    );
  }
  problems.push(
    ...sectionProblems(lesson),
    ...quizProblems(lesson),
    ...labProblems(lesson, meta),
    ...recapProblems(lesson),
  );
  for (const id of lesson.glossary) {
    if (lookupTerm(glossary, id) === undefined) {
      problems.push(`glossary id "${id}" is not in the glossary`);
    }
  }
  return problems.map((problem) => `${meta.id}: ${problem}`);
}
