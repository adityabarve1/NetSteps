import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroAnimation } from '@/pages/HeroAnimation';

// Whatever the global test setup installed; put back after every test.
const originalMatchMedia = window.matchMedia.bind(window);
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
  setMatchMedia(originalMatchMedia);
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
