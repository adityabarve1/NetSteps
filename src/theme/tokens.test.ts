// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Reads the real tokens.css, so a colour changed to one that fails WCAG makes
// this test fail. Text colours must be plain #rrggbb (no alpha), which keeps
// the maths exact.

const srcDir = fileURLToPath(new URL('..', import.meta.url));
const tokensCss = readFileSync(`${srcDir}theme/tokens.css`, 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

type Tokens = Record<string, string>;

function blockOf(selector: RegExp): string {
  const match = selector.exec(tokensCss);
  if (!match) throw new Error(`No block found for ${selector.source}`);
  return match[1] ?? '';
}

function parseVariables(block: string): Tokens {
  const found: Tokens = {};
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    found[m[1] ?? ''] = (m[2] ?? '').trim();
  }
  return found;
}

// The light theme is the :root block; the dark theme overrides it.
const light = parseVariables(blockOf(/:root\s*\{([^}]*)\}/));
const dark: Tokens = {
  ...light,
  ...parseVariables(blockOf(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/)),
};
const themes: [string, Tokens][] = [
  ['light', light],
  ['dark', dark],
];

function colour(tokens: Tokens, name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`Missing token --${name}`);
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`--${name} must be a #rrggbb colour, got "${value}"`);
  }
  return value;
}

function channel(hex: string, start: number): number {
  const v = parseInt(hex.slice(start, start + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) +
    0.7152 * channel(hex, 3) +
    0.0722 * channel(hex, 5)
  );
}

function contrast(tokens: Tokens, foreground: string, background: string) {
  const a = luminance(colour(tokens, foreground));
  const b = luminance(colour(tokens, background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const surfaces = ['bg', 'surface', 'surface-sunken'];
// The landing hero paints a gradient behind its text: every stop must pass.
const heroStops = [
  'hero-from',
  'hero-via',
  'hero-to',
  'hero-glow-a',
  'hero-glow-b',
];
const textColours = ['text', 'text-muted', 'accent', 'accent-2', 'danger'];

describe('contrast of the colour tokens (WCAG)', () => {
  describe.each(themes)('%s theme', (_name, tokens) => {
    it.each(
      textColours.flatMap((fg) =>
        [...surfaces, ...heroStops].map((bg): [string, string] => [fg, bg]),
      ),
    )('--%s on --%s is at least 4.5:1', (fg, bg) => {
      expect(contrast(tokens, fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('--accent-contrast on --accent is at least 4.5:1', () => {
      expect(
        contrast(tokens, 'accent-contrast', 'accent'),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it.each([...surfaces, ...heroStops])(
      'the focus ring is at least 3:1 on --%s',
      (bg) => {
        expect(contrast(tokens, 'focus', bg)).toBeGreaterThanOrEqual(3);
      },
    );

    it.each([...surfaces, ...heroStops])(
      'a control --border (also over the hero gradient) is at least 3:1 on --%s',
      (bg) => {
        expect(contrast(tokens, 'border', bg)).toBeGreaterThanOrEqual(3);
      },
    );

    // The practice terminal paints its own background behind its text.
    it.each(['terminal-text', 'terminal-prompt'])(
      '--%s on --terminal-bg is at least 4.5:1',
      (fg) => {
        expect(contrast(tokens, fg, 'terminal-bg')).toBeGreaterThanOrEqual(4.5);
      },
    );

    it('--terminal-focus is at least 3:1 on --terminal-bg', () => {
      expect(
        contrast(tokens, 'terminal-focus', 'terminal-bg'),
      ).toBeGreaterThanOrEqual(3);
    });

    it('keeps every token the components depend on', () => {
      for (const name of [
        'bg',
        'surface',
        'surface-sunken',
        'text',
        'text-muted',
        'border',
        'accent',
        'accent-contrast',
        'focus',
        'danger',
        'shadow',
        'terminal-bg',
        'terminal-text',
        'terminal-prompt',
      ]) {
        expect(tokens[name], `--${name}`).toBeDefined();
      }
    });
  });
});

// Components must use variables only. Only tokens.css may name a colour.
function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory()
      ? cssFiles(path)
      : entry.name.endsWith('.css')
        ? [path]
        : [];
  });
}

describe('hard-coded colours', () => {
  const colourLiteral =
    /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/i;

  it.each(
    cssFiles(srcDir.replace(/\/$/, '')).filter(
      (file) => !file.endsWith('/theme/tokens.css'),
    ),
  )('%s names no colour outside the tokens', (file) => {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(colourLiteral.exec(css)?.[0]).toBeUndefined();
  });
});

// The progress ring is a graphic, so its parts need 3:1 (WCAG 1.4.11). The test
// reads the stroke each part really uses, so pointing the track back at a soft
// token fails here.
describe('progress ring colours', () => {
  const ringCss = readFileSync(
    `${srcDir}pages/ProgressRing.module.css`,
    'utf8',
  );
  const strokeOf = (rule: string): string => {
    const block = new RegExp(String.raw`\.${rule}\s*\{([^}]*)\}`).exec(ringCss);
    const stroke = /stroke:\s*var\(--([\w-]+)\)/.exec(block?.[1] ?? '');
    if (!stroke) throw new Error(`.${rule} has no stroke: var(--token)`);
    return stroke[1] ?? '';
  };

  it('draws the track with --border and the fill with --accent', () => {
    expect(strokeOf('track')).toBe('border');
    expect(strokeOf('fill')).toBe('accent');
  });

  describe.each(themes)('%s theme', (_name, tokens) => {
    it.each(['track', 'fill'])(
      'the ring %s is at least 3:1 on every surface it sits on',
      (part) => {
        for (const surface of ['surface', 'surface-sunken']) {
          expect(
            contrast(tokens, strokeOf(part), surface),
          ).toBeGreaterThanOrEqual(3);
        }
      },
    );
  });
});
