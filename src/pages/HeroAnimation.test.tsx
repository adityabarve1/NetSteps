import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroAnimation } from '@/pages/HeroAnimation';

const originalMatchMedia = Object.getOwnPropertyDescriptor(
  window,
  'matchMedia',
);
function setMatchMedia(impl: typeof window.matchMedia | undefined) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: impl,
  });
}
function reducedMotion(matches: boolean): typeof window.matchMedia {
  return (query: string) =>
    ({
      matches: matches && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as MediaQueryList;
}

afterEach(() => {
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  }
});

describe('HeroAnimation', () => {
  it('is hidden from assistive technology and not focusable', () => {
    render(<HeroAnimation />);

    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('animates by default', () => {
    setMatchMedia(reducedMotion(false));
    render(<HeroAnimation />);

    expect(document.querySelector('svg')).toHaveAttribute(
      'data-animated',
      'true',
    );
  });

  it('is static when the visitor prefers reduced motion', () => {
    setMatchMedia(reducedMotion(true));
    render(<HeroAnimation />);

    expect(document.querySelector('svg')).toHaveAttribute(
      'data-animated',
      'false',
    );
  });

  it('still renders when matchMedia is missing', () => {
    setMatchMedia(undefined);
    render(<HeroAnimation />);

    expect(document.querySelector('svg')).toHaveAttribute(
      'data-animated',
      'true',
    );
  });
});

describe('Landing page: full-viewport hero', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'src/pages/Landing.module.css'),
    'utf8',
  );
  const heroRule = /\.hero\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('fills the viewport with a 100vh fallback before 100svh', () => {
    expect(heroRule).toMatch(
      /min-height:\s*100vh;[\s\S]*min-height:\s*100svh;/,
    );
  });

  it('uses min-height only, so short screens never clip the content', () => {
    expect(heroRule).not.toMatch(/(?<!min-)height:/);
  });

  it('uses a wide hero box, not the 72rem reading column', () => {
    const inner = /\.heroInner\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const tokens = readFileSync(
      resolve(process.cwd(), 'src/theme/tokens.css'),
      'utf8',
    );
    const heroWidth = /--hero-width:\s*(\d+)rem/.exec(tokens)?.[1] ?? '0';

    expect(inner).toMatch(/width:\s*min\(100%,\s*var\(--hero-width\)\)/);
    expect(inner).not.toMatch(/--content-width|72rem/);
    expect(Number(heroWidth)).toBeGreaterThanOrEqual(100);
  });
});
