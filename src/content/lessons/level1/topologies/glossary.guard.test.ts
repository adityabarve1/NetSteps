// @vitest-environment node
// Guards the lesson's glossary: every <Term id> used in the sources is listed
// in `lesson.glossary`, every listed id exists in the shared glossary, and no
// listed id goes unused.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glossary } from '@/content/glossary';
import lesson from './index';

const DIR = __dirname;
const sources = readdirSync(DIR).filter(
  (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f),
);

function termIdsIn(text: string): string[] {
  const found: string[] = [];
  const pattern = /<Term\s+id=(?:"([^"]+)"|\{\s*['"`]([^'"`]+)['"`]\s*\})/g;
  for (const m of text.matchAll(pattern)) found.push(m[1] ?? m[2] ?? '');
  return found;
}

const used = new Set(
  sources.flatMap((f) => termIdsIn(readFileSync(join(DIR, f), 'utf8'))),
);

describe('lesson 1.3 glossary', () => {
  it('finds the Term ids (so the scan itself is not empty)', () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(used.size).toBeGreaterThanOrEqual(10);
    expect(used).toContain('terminator');
  });

  it('lists every Term id used in the lesson', () => {
    for (const id of used) expect(lesson.glossary, id).toContain(id);
  });

  it('only lists ids that exist in the shared glossary', () => {
    for (const id of lesson.glossary) {
      expect(Object.hasOwn(glossary, id), id).toBe(true);
    }
  });

  it('lists no id that no <Term> uses', () => {
    for (const id of lesson.glossary) expect([...used], id).toContain(id);
  });

  it('has no duplicate ids', () => {
    expect(new Set(lesson.glossary).size).toBe(lesson.glossary.length);
  });
});
