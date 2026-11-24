// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...parts: string[]) => join(root, ...parts);
const readText = (...parts: string[]) =>
  readFileSync(fromRoot(...parts), 'utf8');

const envNames = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SITE_URL',
  'VITE_ENABLE_GOOGLE',
  'VITE_CONTACT_EMAIL',
];
const skillNames = ['netpath-coding', 'netpath-lesson-writing'];

describe('tooling guard', () => {
  it('uses pnpm as the only package manager', () => {
    const pkg = JSON.parse(readText('package.json')) as {
      packageManager?: string;
    };
    expect(pkg.packageManager).toMatch(/^pnpm@/);
    expect(existsSync(fromRoot('package-lock.json'))).toBe(false);
    expect(existsSync(fromRoot('yarn.lock'))).toBe(false);
  });

  it('documents all five environment variables in .env.example', () => {
    const example = readText('.env.example');
    for (const name of envNames) {
      expect(example).toContain(name);
    }
  });

  it('has agent rules that point at pnpm check', () => {
    expect(existsSync(fromRoot('CLAUDE.md'))).toBe(true);
    expect(readText('CLAUDE.md')).toContain('pnpm check');
  });

  it('ships the project skills with valid frontmatter', () => {
    const skillsDir = fromRoot('.claude', 'skills');
    const found = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
    expect(found).toEqual(expect.arrayContaining(skillNames));
    for (const dir of found) {
      const text = readText('.claude', 'skills', dir, 'SKILL.md');
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
      expect(
        match,
        `${dir}/SKILL.md must start with frontmatter`,
      ).not.toBeNull();
      const frontmatter = match?.[1] ?? '';
      expect(frontmatter).toMatch(new RegExp(`^name: ${dir}$`, 'm'));
      expect(frontmatter).toMatch(/^description: \S/m);
    }
  });

  it('denies npm, yarn and npx in Claude settings', () => {
    const settings = JSON.parse(readText('.claude', 'settings.json')) as {
      permissions?: { deny?: string[] };
    };
    const deny = settings.permissions?.deny ?? [];
    expect(deny).toEqual(
      expect.arrayContaining(['Bash(npm *)', 'Bash(yarn *)', 'Bash(npx *)']),
    );
  });
});
