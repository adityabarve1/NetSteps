// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glossary } from '@/content/glossary';
import lesson from './index';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => readFileSync(join(dir, f), 'utf8'));
const text = sources.join('\n');

// Every <Term ...> opening tag, wrapped or not, and the ids found in them.
const openings = text.match(/<Term\b/g) ?? [];
const ids = [...text.matchAll(/<Term\s+id="([^"]+)"/g)].map((m) => m[1] ?? '');

describe('glossary terms of lesson 1.6', () => {
  it('every <Term> has an id written as id="..." right after the tag name', () => {
    expect(openings.length).toBeGreaterThan(0);
    expect(ids).toHaveLength(openings.length);
  });

  it('every term used is listed in lesson.glossary', () => {
    for (const id of new Set(ids)) {
      expect(lesson.glossary, id).toContain(id);
    }
  });

  it('every id in lesson.glossary exists in the shared glossary', () => {
    for (const id of lesson.glossary) {
      expect(Object.hasOwn(glossary, id), id).toBe(true);
    }
  });

  it('no id in lesson.glossary is unused by a <Term>', () => {
    // Ids that other lessons define and this lesson only lists must still be used.
    for (const id of lesson.glossary) {
      expect(ids, id).toContain(id);
    }
  });

  it('lists no id twice', () => {
    expect(new Set(lesson.glossary).size).toBe(lesson.glossary.length);
  });
});
