// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(process.cwd(), 'src/quiz/Quiz.module.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function ruleOf(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(
      css,
    )?.[1] ?? ''
  );
}

// At 320px an option such as an IP address must never be split in the middle by
// the "Your answer" badge: the badge wraps onto its own line instead.
describe('quiz option layout on a narrow screen', () => {
  it('lets the badge wrap to its own line', () => {
    expect(ruleOf('.option')).toMatch(/flex-wrap:\s*wrap/);
  });

  it('breaks words only as a last resort, never inside a short token', () => {
    expect(ruleOf('.option')).not.toMatch(/overflow-wrap:\s*anywhere/);
    expect(ruleOf('.option')).toMatch(/overflow-wrap:\s*break-word/);
    expect(ruleOf('.label')).toMatch(/overflow-wrap:\s*break-word/);
    expect(ruleOf('.label')).toMatch(/word-break:\s*normal/);
  });

  it('gives the option text a width of its own before the badge may share the line', () => {
    expect(ruleOf('.label')).toMatch(/flex:\s*1 1 \d+(\.\d+)?rem/);
    expect(ruleOf('.tag')).toMatch(/margin-left:\s*auto/);
  });
});
