import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SimPlayer } from '@/sim/SimPlayer';
import {
  caption,
  fourSteps,
  renderStep,
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
const click = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }));

describe('onFinished', () => {
  it('fires once, with the sim id, when the last step is first reached', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(player({ onFinished }));

    await click(user, 'Next');
    await click(user, 'Next');
    expect(onFinished).not.toHaveBeenCalled();

    await click(user, 'Next');
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledWith('sim-a');
  });

  it('does not fire again after Reset and a second run', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(player({ onFinished }));

    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    await click(user, 'Reset');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    await click(user, 'Back');
    await click(user, 'Next');

    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('fires when the scrubber is dragged to the end', () => {
    const onFinished = vi.fn();
    render(player({ onFinished }));

    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });

  it('fires when the End key jumps to the last step', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(player({ onFinished }));
    screen.getByRole('group').focus();

    await user.keyboard('{End}');

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });

  it('does not fire for a click on Back, or on a middle step', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(player({ onFinished }));

    await click(user, 'Next');
    await click(user, 'Back');

    expect(onFinished).not.toHaveBeenCalled();
  });

  it('fires once on mount for a one-step simulation', () => {
    const onFinished = vi.fn();
    render(player({ steps: [{ n: 0 }], onFinished }));

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('a new onFinished function does not cause a second call', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(player({ onFinished: first }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });

    rerender(player({ onFinished: second }));
    rerender(player({ onFinished: vi.fn() }));
    await click(user, 'Reset');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('uses the newest onFinished if it changed before the end', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(player({ onFinished: first }));
    rerender(player({ onFinished: second }));

    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    await click(user, 'Reset');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith('sim-a');
  });

  it('works without an onFinished prop', () => {
    render(player());
    expect(() => {
      fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    }).not.toThrow();
  });
});

describe('onFinished under StrictMode as the root element', () => {
  // React only double-runs effects (mount, unmount, mount) when StrictMode wraps
  // the root. The "already told" flag lives in a ref, and a ref survives that
  // simulated remount, so a one-step sim (which finishes on mount) is still
  // reported once.
  it('fires once for a one-step simulation', () => {
    const onFinished = vi.fn();
    render(
      <StrictMode>{player({ steps: [{ n: 0 }], onFinished })}</StrictMode>,
    );

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });

  it('fires once when the learner reaches the last step', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(<StrictMode>{player({ onFinished })}</StrictMode>);

    await click(user, 'Next');
    await click(user, 'Next');
    await click(user, 'Next');
    await click(user, 'Reset');

    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });
});

describe('when the steps change', () => {
  it('a new list with the same length and a new identity keeps the place', async () => {
    const user = userEvent.setup();
    const { rerender } = render(player());
    await click(user, 'Next');
    await click(user, 'Next');

    rerender(player({ steps: fourSteps.map((s) => ({ ...s })) }));

    expect(status()).toHaveTextContent('Caption 2.');
  });

  it('a shorter list clamps the index and counts as finished', () => {
    const onFinished = vi.fn();
    const { rerender } = render(player({ onFinished }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });

    rerender(player({ steps: fourSteps.slice(0, 2), onFinished }));

    expect(status()).toHaveTextContent('Caption 1.');
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('max', '1');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(onFinished).toHaveBeenCalledExactlyOnceWith('sim-a');
  });

  it('a longer list keeps the index and does not fire onFinished again', () => {
    const onFinished = vi.fn();
    const more = [...fourSteps, { n: 4 }, { n: 5 }];
    const { rerender } = render(player({ onFinished }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });

    rerender(player({ steps: more, onFinished }));

    expect(status()).toHaveTextContent('Caption 3.');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('a different id starts a fresh player that can finish again', async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    const { rerender } = render(player({ onFinished }));
    await click(user, 'Next');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });

    rerender(player({ id: 'sim-b', onFinished }));
    expect(status()).toHaveTextContent('Caption 0.');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(onFinished.mock.calls).toEqual([['sim-a'], ['sim-b']]);
  });

  it('going to no steps and back does not crash or fire again', () => {
    const onFinished = vi.fn();
    const { rerender } = render(player({ onFinished }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });

    rerender(player({ steps: [], onFinished }));
    expect(screen.getByText(/Nothing to show/)).toBeInTheDocument();

    rerender(player({ onFinished }));
    expect(status()).toHaveTextContent('Caption 3.');
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('empty first, then steps arrive: starts at step 0', () => {
    const { rerender } = render(player({ steps: [] }));

    rerender(player());

    expect(status()).toHaveTextContent('Caption 0.');
  });
});
