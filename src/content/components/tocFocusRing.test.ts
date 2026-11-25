// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('./TableOfContents.module.css', import.meta.url),
  'utf8',
);

describe('TableOfContents phone layout', () => {
  it('pads the scrolling list so the 3px + 2px focus ring is not clipped', () => {
    // The phone rule is the first .list block, before the wide-screen media query.
    const phone = /\.list\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(phone).toMatch(/overflow-x:\s*auto/);
    const padding = /padding:\s*([^;]+);/.exec(phone)?.[1] ?? '';
    const [top, right] = padding.trim().split(/\s+/);
    // 0.375rem is 6px: the 3px outline plus its 2px offset, with a pixel to spare.
    expect(top).toBe('0.375rem');
    expect(right).toBe('0.375rem');
  });
});
