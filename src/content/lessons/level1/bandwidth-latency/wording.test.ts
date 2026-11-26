// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const files = readdirSync(dir).filter(
  (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f),
);

// Words the writing guide bans, and the product name (defined once in
// src/config/site.ts, never repeated in a lesson).
const BANNED =
  /\b(simply|just|obviously|easy|easily|of course|clearly|basically)\b/i;

describe('lesson 1.5 wording', () => {
  it.each(files)('%s has no banned words', (f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    expect(BANNED.exec(text)?.[0]).toBeUndefined();
  });

  it('never hard-codes the product name', () => {
    for (const f of files) {
      expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/NetSteps/);
    }
  });
});
