import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimPlayer } from '@/sim/SimPlayer';
import {
  caption,
  fourSteps,
  renderStep,
  resetVisibility,
  restoreMatchMedia,
  setReducedMotion,
  setVisibility,
  type TestStep,
} from '@/sim/simTestKit';

function player(
  props: Partial<Parameters<typeof SimPlayer<TestStep>>[0]> = {},
): ReactElement {
  return (
    <SimPlayer<TestStep>
      id="sim-a"
      steps={fourSteps}
      caption={caption}
      render={renderStep}
      {...props}
    />
  );
}

const status = () => screen.getByRole('status');
const button = (name: string) => screen.getByRole('button', { name });
// Each step sets up the next timer in an effect, which only runs when React
// commits. So move the clock 1 ms at a time, inside act, while a timer is
// pending; with no timer left the rest of the time can pass in one jump.
const advance = (ms: number) => {
  let left = ms;
  while (left > 0) {
    const chunk = vi.getTimerCount() === 0 ? left : 1;
    act(() => {
      vi.advanceTimersByTime(chunk);
    });
    left -= chunk;
  }
};
// user-event waits on real timers, which hangs under fake ones, so these tests
// use fireEvent (it is already wrapped in act by Testing Library).
const click = (name: string) => {
  fireEvent.click(button(name));
};
const chooseSpeed = (value: string) => {
  fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), {
    target: { value },
  });
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  restoreMatchMedia();
  resetVisibility();
});

describe('autoplay', () => {
  it('Play becomes Pause and advances one step every 1800 ms by default', () => {
    render(player());

    click('Play');
    expect(button('Pause')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Caption 0.');

    advance(1799);
    expect(status()).toHaveTextContent('Caption 0.');
    advance(1);
    expect(status()).toHaveTextContent('Caption 1.');
    advance(1800);
    expect(status()).toHaveTextContent('Caption 2.');
  });

  it('stops at the last step, with no timer left, and offers Play again', () => {
    render(player());

    click('Play');
    advance(1800 * 3);

    expect(status()).toHaveTextContent('Caption 3.');
    expect(button('Play again')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    advance(20000);
    expect(status()).toHaveTextContent('Caption 3.');
  });

  it('Play again restarts from step 0', () => {
    render(player());
    click('Play');
    advance(1800 * 3);

    click('Play again');

    expect(status()).toHaveTextContent('Caption 0.');
    expect(button('Pause')).toBeInTheDocument();
    advance(1800);
    expect(status()).toHaveTextContent('Caption 1.');
  });

  it('Pause stops the clock and leaves no timer', () => {
    render(player());
    click('Play');
    advance(1800);

    click('Pause');

    expect(vi.getTimerCount()).toBe(0);
    advance(10000);
    expect(status()).toHaveTextContent('Caption 1.');
  });

  it('uses the stepMs prop', () => {
    render(player({ stepMs: 500 }));

    click('Play');
    advance(500);

    expect(status()).toHaveTextContent('Caption 1.');
  });

  it('2x halves the wait and 0.5x doubles it', () => {
    render(player({ stepMs: 1000 }));

    chooseSpeed('2');
    click('Play');
    advance(499);
    expect(status()).toHaveTextContent('Caption 0.');
    advance(1);
    expect(status()).toHaveTextContent('Caption 1.');

    chooseSpeed('0.5');
    advance(1999);
    expect(status()).toHaveTextContent('Caption 1.');
    advance(1);
    expect(status()).toHaveTextContent('Caption 2.');
  });

  it('changing speed while playing leaves exactly one timer running', () => {
    render(player());
    click('Play');

    chooseSpeed('2');

    expect(vi.getTimerCount()).toBe(1);
  });

  it('Back, Next and the scrubber pause autoplay (manual control wins)', () => {
    render(player());

    click('Play');
    advance(1800 * 2);
    click('Back');
    expect(button('Play')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Caption 1.');
    expect(vi.getTimerCount()).toBe(0);

    click('Play');
    click('Next');
    expect(button('Play')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Caption 2.');
  });

  it('Reset stops autoplay and goes to step 0', () => {
    render(player());
    click('Play');
    advance(1800);

    click('Reset');

    expect(status()).toHaveTextContent('Caption 0.');
    expect(button('Play')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps autoplaying under reduced motion, passing the flag to render', () => {
    setReducedMotion(true);
    render(player());

    click('Play');
    advance(1800);

    expect(status()).toHaveTextContent('Caption 1.');
    expect(screen.getByText('Picture 1 at 1 reduced=true')).toBeInTheDocument();
  });

  it('calls onFinished once when autoplay reaches the end', () => {
    const onFinished = vi.fn();
    render(player({ onFinished }));

    click('Play');
    advance(1800 * 3);
    advance(20000);

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });
});

describe('background tab', () => {
  it('pauses autoplay when the page becomes hidden, and stays paused', () => {
    render(player());
    click('Play');
    advance(1800);

    act(() => {
      setVisibility('hidden');
    });

    expect(button('Play')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    advance(20000);
    expect(status()).toHaveTextContent('Caption 1.');

    act(() => {
      setVisibility('visible');
    });
    expect(button('Play')).toBeInTheDocument(); // does not resume by itself
  });

  it('ignores visibilitychange when the page is still visible', () => {
    render(player());
    click('Play');

    act(() => {
      setVisibility('visible');
    });

    expect(button('Pause')).toBeInTheDocument();
  });

  it('stops listening after unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(player());

    unmount();

    expect(remove).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    remove.mockRestore();
  });
});

describe('cleanup', () => {
  it('leaves no timer behind after unmounting mid-play', () => {
    const onFinished = vi.fn();
    const { unmount } = render(player({ onFinished }));
    click('Play');
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    advance(1800 * 10);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('clears the old timer with clearTimeout on every change', () => {
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(player());

    click('Play');
    const before = clear.mock.calls.length;
    advance(1800);
    expect(clear.mock.calls.length).toBeGreaterThan(before);

    const beforeUnmount = clear.mock.calls.length;
    unmount();
    expect(clear.mock.calls.length).toBeGreaterThan(beforeUnmount);
    clear.mockRestore();
  });

  it('has no timer at all while paused', () => {
    render(player());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('steps shrinking to the last step while playing stops the timer', () => {
    const { rerender } = render(player());
    click('Play');
    advance(1800 * 2);

    rerender(player({ steps: fourSteps.slice(0, 3) }));

    expect(status()).toHaveTextContent('Caption 2.');
    expect(button('Play again')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
