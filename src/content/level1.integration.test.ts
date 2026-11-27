// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { curriculum } from './curriculum';
import { glossary } from './glossary';
import { loadLesson } from './loaders';
import type { Lesson } from './types';

// Checks across the whole Level 1 set. Per-lesson rules live in
// validate.test.ts and validateLesson.test.ts; the built set equals the
// registered loaders in curriculum.test.ts. This file only looks for clashes
// between lessons and for glossary links that point nowhere.

const here = import.meta.dirname;
const builtIds = curriculum
  .flatMap((level) => level.lessons)
  .filter((lesson) => lesson.built)
  .map((lesson) => lesson.id);

async function loadAll(): Promise<Lesson[]> {
  const lessons: Lesson[] = [];
  for (const id of builtIds) {
    const lesson = await loadLesson(id);
    if (lesson === undefined) throw new Error(`${id} did not load`);
    lessons.push(lesson);
  }
  return lessons;
}

function duplicates(values: string[]): string[] {
  return values.filter((value, i) => values.indexOf(value) !== i);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe('the built Level 1 lessons together', () => {
  it('have at least four lessons to compare', () => {
    expect(builtIds.length).toBeGreaterThanOrEqual(4);
  });

  it('use a different primary simulation each', async () => {
    const ids = (await loadAll()).map((l) => l.primarySimulationId);
    expect(duplicates(ids)).toEqual([]);
  });

  it('use a different lab id each, across all lessons', async () => {
    const ids = (await loadAll()).flatMap((l) => l.labs.map((lab) => lab.id));
    expect(duplicates(ids)).toEqual([]);
  });

  it('list no lab id in the curriculum for more than one lesson', () => {
    const ids = curriculum.flatMap((level) =>
      level.lessons.flatMap((lesson) => lesson.labIds),
    );
    expect(duplicates(ids)).toEqual([]);
  });

  it('never repeat the same set of options in two quiz questions of one lesson', async () => {
    for (const lesson of await loadAll()) {
      const sets = lesson.quiz.map((q) =>
        JSON.stringify([...q.options].sort()),
      );
      expect(duplicates(sets), lesson.id).toEqual([]);
    }
  });

  it('use only <Term> ids that exist in the shared glossary', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(here, 'lessons', 'level1'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/<Term\s+id="([^"]+)"/g)) {
        const id = m[1] ?? '';
        if (!Object.hasOwn(glossary, id)) missing.push(`${file}: ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the Level 1 glossary files', () => {
  it('have no duplicate keys, within or between files', () => {
    const dir = join(here, 'glossary');
    const files = readdirSync(dir).filter((name) =>
      /^level1.*\.ts$/.test(name),
    );
    expect(files.length).toBeGreaterThanOrEqual(2);
    const keys = files.flatMap((name) =>
      [
        ...readFileSync(join(dir, name), 'utf8').matchAll(
          /^ {2}'?([\w-]+)'?: \{/gm,
        ),
      ].map((m) => m[1] ?? ''),
    );
    expect(keys.length).toBeGreaterThan(20);
    expect(duplicates(keys)).toEqual([]);
    expect(new Set(keys)).toEqual(new Set(Object.keys(glossary)));
  });
});
