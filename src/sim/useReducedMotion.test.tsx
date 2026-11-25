import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from '@/sim/useReducedMotion';
import { restoreMatchMedia } from '@/sim/simTestKit';

function Probe() {
  return <p>{useReducedMotion() ? 'reduced' : 'full'}</p>;
}

type Listener = () => void;

// A matchMedia whose answer can change, like the operating-system setting.
function installChangingMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_type: string, fn: Listener) => {
      listeners.add(fn);
    }),
    removeEventListener: vi.fn((_type: string, fn: Listener) => {
      listeners.delete(fn);
    }),
  };
  const matchMedia = vi.fn(() => mql as unknown as MediaQueryList);
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMedia,
  });
  return {
    mql,
    matchMedia,
    listeners,
    change(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((fn) => {
        fn();
      });
    },
  };
}

afterEach(() => {
  restoreMatchMedia();
});

describe('useReducedMotion', () => {
  it('is false when the visitor has no preference', () => {
    render(<Probe />);
    expect(screen.getByText('full')).toBeInTheDocument();
  });

  it('asks for the prefers-reduced-motion query', () => {
    const fake = installChangingMatchMedia(true);
    render(<Probe />);

    expect(screen.getByText('reduced')).toBeInTheDocument();
    expect(fake.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    );
  });

  it('follows change events in both directions', () => {
    const fake = installChangingMatchMedia(false);
    render(<Probe />);
    expect(screen.getByText('full')).toBeInTheDocument();

    act(() => {
      fake.change(true);
    });
    expect(screen.getByText('reduced')).toBeInTheDocument();

    act(() => {
      fake.change(false);
    });
    expect(screen.getByText('full')).toBeInTheDocument();
  });

  it('removes its listener on unmount, with the one it added', () => {
    const fake = installChangingMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(fake.listeners.size).toBe(1);

    unmount();

    expect(fake.listeners.size).toBe(0);
    expect(fake.mql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('shares nothing between two users of the hook (each cleans up)', () => {
    const fake = installChangingMatchMedia(false);
    const a = render(<Probe />);
    const b = render(<Probe />);
    a.unmount();
    expect(fake.listeners.size).toBe(1);
    b.unmount();
    expect(fake.listeners.size).toBe(0);
  });

  it('is false, and does not throw, when matchMedia is missing', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { unmount } = render(<Probe />);
    expect(screen.getByText('full')).toBeInTheDocument();
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('renders "no preference" on the server', () => {
    installChangingMatchMedia(true);
    expect(renderToString(<Probe />)).toContain('full');
  });
});
