import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  A,
  defaultLoad,
  loadLessonMock,
  makeLesson,
} from '@/test/lessonTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';

vi.mock('@/content/curriculum', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { curriculum: kit.testCurriculum, findLesson: kit.testFindLesson };
});
vi.mock('@/content/loaders', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { loadLesson: kit.loadLessonMock };
});

const css = (file: string) =>
  readFileSync(resolve(process.cwd(), file), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

// The declarations of the first rule for `selector` inside the media block that
// starts with `query` (or at top level when query is undefined).
function ruleIn(source: string, selector: string, query?: string): string {
  let scope = source;
  if (query !== undefined) {
    const start = source.indexOf(`@media ${query}`);
    if (start < 0) return '';
    let depth = 0;
    let end = start;
    for (let i = source.indexOf('{', start); i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    scope = source.slice(source.indexOf('{', start) + 1, end);
  }
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(
      scope,
    )?.[1] ?? ''
  );
}

beforeEach(() => {
  loadLessonMock.mockReset();
  loadLessonMock.mockImplementation(defaultLoad);
});

describe('LessonPage: key terms aside', () => {
  beforeEach(() => {
    loadLessonMock.mockImplementation((id) =>
      Promise.resolve(
        id === A ? makeLesson(A, { glossary: ['network', 'link'] }) : undefined,
      ),
    );
  });

  it('renders once, after the recap and before the next-lesson link', async () => {
    renderLessonPage(`/learn/level-1/${A}`);

    const asides = await screen.findAllByRole('complementary', {
      name: 'Key terms',
    });
    expect(asides).toHaveLength(1);
    const aside = asides[0];
    const recap = screen.getByRole('heading', { name: 'Recap' });
    const next = screen.getByRole('link', { name: /^Next:/ });
    expect(aside).toBeDefined();
    if (aside === undefined) return;
    expect(recap.compareDocumentPosition(aside)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(aside.compareDocumentPosition(next)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps one h1 and no skipped heading level, and has no axe violations', async () => {
    const { container } = renderLessonPage(`/learn/level-1/${A}`);
    await screen.findByRole('complementary', { name: 'Key terms' });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    let previous = 0;
    for (const heading of screen.getAllByRole('heading')) {
      const level = Number(heading.tagName.slice(1));
      expect(level).toBeLessThanOrEqual(previous + 1);
      previous = level;
    }
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows no aside for a lesson without glossary terms', async () => {
    loadLessonMock.mockImplementation(defaultLoad);
    renderLessonPage(`/learn/level-1/${A}`);
    await screen.findByRole('heading', { level: 1, name: 'Lesson A' });

    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

describe('fluid root type (global.css)', () => {
  const global = css('src/theme/global.css');

  it('is 100% up to 1440px and grows to 130% by 2560px, in percentages', () => {
    const html = ruleIn(global, 'html');
    const size = /font-size:\s*clamp\(([^;]+)\);/.exec(html)?.[1] ?? '';
    expect(size).toMatch(/^100%,/);
    expect(size).toMatch(/,\s*130%$/);
    expect(size).toContain('1440px');
    // 30% of 16px over 1120px of width, as px added to 100%.
    const slope = Number(/\*\s*([\d.]+)\)/.exec(size)?.[1]);
    expect(slope * (2560 - 1440)).toBeCloseTo(0.3 * 16, 0);
    expect(html).not.toMatch(/font-size:\s*\d+px/);
  });
});

describe('lesson layout (LessonPage.module.css)', () => {
  const page = css('src/pages/LessonPage.module.css');
  const wide = '(min-width: 92rem)';

  it('keeps two columns from 60rem and adds three columns from 92rem', () => {
    expect(ruleIn(page, '.page', '(min-width: 60rem)')).toMatch(
      /grid-template-columns:\s*14rem\s+minmax\(0,\s*1fr\)/,
    );
    const three = ruleIn(page, '.page', wide);
    expect(three).toMatch(
      /grid-template-columns:\s*[\d.]+rem\s+minmax\(0,\s*1fr\)\s+[\d.]+rem/,
    );
  });

  it('makes the key terms rail sticky below the header, scrolling inside', () => {
    const rail = ruleIn(page, '.rail', wide);
    expect(rail).toMatch(/position:\s*sticky/);
    expect(rail).toMatch(/top:\s*var\(--space-4\)/);
    expect(rail).toMatch(/max-height:\s*calc\(100svh/);
    expect(rail).toMatch(/overflow-y:\s*auto/);
  });

  it('caps prose at about 80 characters, in ch', () => {
    const measure = /--measure:\s*(\d+)ch/.exec(page)?.[1];
    expect(Number(measure)).toBeGreaterThanOrEqual(75);
    expect(Number(measure)).toBeLessThanOrEqual(85);
  });

  it('uses one left edge: prose and wide blocks are both left aligned', () => {
    expect(page).not.toMatch(/margin-inline:\s*auto/);
    expect(ruleIn(page, '.content [data-wide]')).toMatch(/max-width:\s*none/);
  });

  it('gives prose a line height of at least 1.55', () => {
    const lh = /\.content\s*\{[^}]*line-height:\s*([\d.]+)/.exec(page)?.[1];
    expect(Number(lh)).toBeGreaterThanOrEqual(1.55);
  });
});
