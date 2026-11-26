// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { glossary } from '@/content/glossary';
import lesson from './index';

// The source text of every lesson file that can hold a <Term id="...">.
const sources = import.meta.glob<string>(
  ['./*.ts', './*.tsx', '!./*.test.ts', '!./*.test.tsx'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

const used = new Set<string>();
let opened = 0;
let matched = 0;
for (const text of Object.values(sources)) {
  opened += text.split('<Term').length - 1;
  // \s* lets the id sit on the next line after a wrapped "<Term".
  for (const m of text.matchAll(/<Term\s+id="([a-z0-9-]+)"/g)) {
    const id = m[1];
    if (id !== undefined) {
      used.add(id);
      matched += 1;
    }
  }
}

describe('lesson 1.2 glossary', () => {
  it('finds the Term ids in the lesson files', () => {
    expect(used.size).toBeGreaterThanOrEqual(15);
    expect(used.has('bluetooth')).toBe(true);
    expect(used.has('internet')).toBe(true);
  });

  it('matches every <Term (none is hidden by a line break or a computed id)', () => {
    expect(opened).toBeGreaterThanOrEqual(15);
    expect(matched).toBe(opened);
  });

  it('lists every id used in a <Term> in lesson.glossary', () => {
    const listed = new Set(lesson.glossary);
    const missing = [...used].filter((id) => !listed.has(id));
    expect(missing).toEqual([]);
  });

  it('has every listed id in the shared glossary', () => {
    const missing = lesson.glossary.filter((id) => !(id in glossary));
    expect(missing).toEqual([]);
  });
});
