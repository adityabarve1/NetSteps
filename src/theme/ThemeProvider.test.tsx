import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/useTheme';

const STORAGE_KEY = 'netsteps.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function Probe() {
  const { mode, resolved, setMode } = useTheme();
  return (
    <div>
      <p>Mode: {mode}</p>
      <p>Resolved: {resolved}</p>
      {(['light', 'dark', 'system'] as const).map((choice) => (
        <button
          key={choice}
          type="button"
          onClick={() => {
            setMode(choice);
          }}
        >
          Pick {choice}
        </button>
      ))}
    </div>
  );
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

/** Simulates the operating system theme and lets a test flip it. */
function mockSystemTheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === DARK_QUERY && dark,
        media: query,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener);
        },
      }) as unknown as MediaQueryList,
  );
  return {
    setDark: (next: boolean) => {
      dark = next;
      listeners.forEach((listener) => {
        listener();
      });
    },
    restore: () => {
      spy.mockRestore();
    },
  };
}

describe('ThemeProvider', () => {
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => {
      cleanup();
    });
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('defaults to system mode and resolves to light when the system is not dark', () => {
    renderProbe();

    expect(screen.getByText('Mode: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('setMode("dark") sets data-theme and stores the choice', async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'Pick dark' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(screen.getByText('Mode: dark')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
  });

  it('restores a stored mode on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');

    renderProbe();

    expect(screen.getByText('Mode: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores a corrupt stored value and falls back to system', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"a theme"}');

    renderProbe();

    expect(screen.getByText('Mode: system')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('system mode follows the operating system preference, including live changes', () => {
    const system = mockSystemTheme(true);
    cleanups.push(system.restore);

    renderProbe();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');

    act(() => {
      system.setDark(false);
    });
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('an explicit choice ignores the operating system preference', async () => {
    const system = mockSystemTheme(true);
    cleanups.push(system.restore);
    const user = userEvent.setup();
    renderProbe();

    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Pick light' }));
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Pick system' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  // RF2: localStorage unavailable (private window, quota full) must not crash.
  it('still renders and switches when localStorage.getItem and setItem throw', async () => {
    const denied = () => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    };
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(denied);
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(denied);
    cleanups.push(
      () => {
        getItem.mockRestore();
      },
      () => {
        setItem.mockRestore();
      },
    );
    const user = userEvent.setup();

    renderProbe();
    expect(screen.getByText('Mode: system')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pick dark' }));

    expect(setItem).toHaveBeenCalled();
    expect(screen.getByText('Mode: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Pick light' }));
    expect(screen.getByText('Mode: light')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('still renders and switches when reading window.localStorage itself throws', async () => {
    const accessor = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError');
      });
    cleanups.push(() => {
      accessor.mockRestore();
    });
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole('button', { name: 'Pick dark' }));

    expect(screen.getByText('Mode: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
