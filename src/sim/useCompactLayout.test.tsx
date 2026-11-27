import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCompactLayout } from '@/sim/useCompactLayout';
import { restoreMatchMedia } from '@/sim/simTestKit';

function Probe({ rem }: { rem?: number }) {
  const compact = useCompactLayout(rem);
  return <p>{compact ? 'compact' : 'wide'}</p>;
}

type Listener = () => void;

// A matchMedia that answers per query and can change, like a resized window.
function installMatchMedia(matching: (query: string) => boolean) {
  const listeners = new Set<Listener>();
  const state = { matching };
  const queries: string[] = [];
  const matchMedia = vi.fn((query: string) => {
    queries.push(query);
    return {
      get matches() {
        return state.matching(query);
      },
      media: query,
      addEventListener: (_type: string, fn: Listener) => {
        listeners.add(fn);
      },
      removeEventListener: (_type: string, fn: Listener) => {
        listeners.delete(fn);
      },
    } as unknown as MediaQueryList;
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMedia,
  });
  return {
    queries,
    listeners,
    change(next: (query: string) => boolean) {
      state.matching = next;
      listeners.forEach((fn) => {
        fn();
      });
    },
  };
}

afterEach(() => {
  restoreMatchMedia();
});

describe('useCompactLayout', () => {
  it('is false (wide) by default when nothing matches', () => {
    render(<Probe />);
    expect(screen.getByText('wide')).toBeInTheDocument();
  });

  it('asks for a max-width of 30rem by default', () => {
    const fake = installMatchMedia(() => true);
    render(<Probe />);

    expect(screen.getByText('compact')).toBeInTheDocument();
    expect(fake.queries).toContain('(max-width: 30rem)');
  });

  it('takes the width in rem', () => {
    const fake = installMatchMedia((query) => query === '(max-width: 40rem)');
    render(<Probe rem={40} />);

    expect(screen.getByText('compact')).toBeInTheDocument();
    expect(fake.queries).toContain('(max-width: 40rem)');
  });

  it('follows the window size in both directions', () => {
    const fake = installMatchMedia(() => false);
    render(<Probe />);
    expect(screen.getByText('wide')).toBeInTheDocument();

    act(() => {
      fake.change(() => true);
    });
    expect(screen.getByText('compact')).toBeInTheDocument();

    act(() => {
      fake.change(() => false);
    });
    expect(screen.getByText('wide')).toBeInTheDocument();
  });

  it('removes its listener on unmount', () => {
    const fake = installMatchMedia(() => false);
    const { unmount } = render(<Probe />);
    expect(fake.listeners.size).toBe(1);

    unmount();
    expect(fake.listeners.size).toBe(0);
  });

  it('is false, and does not throw, when matchMedia is missing', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { unmount } = render(<Probe />);
    expect(screen.getByText('wide')).toBeInTheDocument();
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('renders the wide drawing on the server', () => {
    installMatchMedia(() => true);
    expect(renderToString(<Probe />)).toContain('wide');
  });
});
