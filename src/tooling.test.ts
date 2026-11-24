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

  it('keeps privileged Supabase keys out of src and scripts', () => {
    // Built from parts so this test file does not trip its own scan.
    const privilegedKey = new RegExp(['service', 'role'].join('[_-]?'), 'i');
    const sourceFile = /\.(?:tsx?|jsx?|css|json|html|svg|md)$/;
    const offenders: string[] = [];
    const scan = (dir: string): void => {
      if (!existsSync(dir)) {
        return;
      }
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(path);
        } else if (
          sourceFile.test(entry.name) &&
          privilegedKey.test(readFileSync(path, 'utf8'))
        ) {
          offenders.push(path);
        }
      }
    };
    scan(fromRoot('src'));
    scan(fromRoot('scripts'));
    expect(offenders).toEqual([]);
  });

  it('denies npm, npx and yarn in both the Bash and PowerShell tools', () => {
    const settings = JSON.parse(readText('.claude', 'settings.json')) as {
      permissions?: { deny?: string[] };
    };
    const deny = settings.permissions?.deny ?? [];
    // Bash(...) and PowerShell(...) are separate rule namespaces, and an
    // `npm *` rule does not cover `npx`, so every combination needs an entry.
    for (const shell of ['Bash', 'PowerShell']) {
      for (const tool of ['npm', 'npx', 'yarn']) {
        expect(deny, `deny list must include ${shell}(${tool} *)`).toContain(
          `${shell}(${tool} *)`,
        );
      }
    }
  });
});
