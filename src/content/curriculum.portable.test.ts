// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Task 22 builds the sitemap by running the curriculum with tsx in plain Node:
// no Vite, so no "@/" alias, no React and no JSX. This runs it exactly that way
// and fails if the curriculum (or anything it imports) needs more than that.

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('curriculum.ts in plain Node', () => {
  it('imports and runs under tsx without the @/ alias or React', () => {
    const code = [
      "const { curriculum, findLesson } = await import('./src/content/curriculum.ts');",
      "const lesson = findLesson('level-1', 'l1-topologies');",
      'console.log(JSON.stringify({',
      '  levels: curriculum.length,',
      '  title: lesson?.title,',
      '}));',
    ].join('\n');
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', code],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(JSON.parse(output.trim())).toEqual({
      levels: 7,
      title: 'Topologies',
    });
  }, 30_000);
});
