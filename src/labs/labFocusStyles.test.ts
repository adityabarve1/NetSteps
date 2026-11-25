// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8');

describe('builder and terminal visual states', () => {
  const canvas = read('./BuilderCanvas.module.css');

  it('draws an inner focus ring on a focused device', () => {
    expect(canvas).toMatch(
      /\.node:focus-visible \.ring\s*\{[^}]*display:\s*block/,
    );
    expect(canvas).toMatch(/\.ring\s*\{[^}]*stroke:\s*var\(--focus\)/);
  });

  it('keeps the accent outline when the focused device is also selected', () => {
    expect(canvas).toMatch(
      /\.nodeSelected:focus-visible \.box\s*\{[^}]*stroke:\s*var\(--accent\)/,
    );
  });

  it('gives the terminal box a 1px token border, distinct in dark theme', () => {
    const screen = /\.screen\s*\{([^}]*)\}/.exec(
      read('./TerminalLab.module.css'),
    );
    expect(screen?.[1]).toMatch(/border:\s*1px solid var\(--border-soft\)/);
  });
});
