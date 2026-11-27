import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactElement } from 'react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimPlayer } from '@/sim/SimPlayer';
import {
  caption,
  fourSteps,
  renderStep,
  restoreMatchMedia,
  setReducedMotion,
  type TestStep,
} from '@/sim/simTestKit';

afterEach(() => {
  restoreMatchMedia();
});

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

describe('SimPlayer basics', () => {
  it('shows the caption of step 0 inside a polite status region', () => {
    render(player());

    expect(status()).toHaveTextContent('Caption 0.');
    expect(screen.getByText('Caption 0.')).toBe(status());
  });

  it('shows the step counter and what render() drew', () => {
    render(player());

    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Picture 0 at 0 reduced=false'),
    ).toBeInTheDocument();
  });

  it('Next shows the next caption and picture', async () => {
    const user = userEvent.setup();
    render(player());

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(status()).toHaveTextContent('Caption 1.');
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(
      screen.getByText('Picture 1 at 1 reduced=false'),
    ).toBeInTheDocument();
  });

  it('Back is disabled at step 0 and goes back after Next', async () => {
    const user = userEvent.setup();
    render(player());
    const back = screen.getByRole('button', { name: 'Back' });
    expect(back).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(back).toBeEnabled();
    await user.click(back);

    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('Next is disabled on the last step', async () => {
    const user = userEvent.setup();
    render(player());
    const next = screen.getByRole('button', { name: 'Next' });

    await user.click(next);
    await user.click(next);
    await user.click(next);

    expect(status()).toHaveTextContent('Caption 3.');
    expect(next).toBeDisabled();
  });

  it('Reset goes back to the first step', async () => {
    const user = userEvent.setup();
    render(player());
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('is a labelled group, with a default label and a custom one', () => {
    const { rerender } = render(player());
    expect(
      screen.getByRole('group', { name: 'Simulation controls and view' }),
    ).toBeInTheDocument();

    rerender(player({ label: 'Packet journey' }));
    expect(
      screen.getByRole('group', { name: 'Packet journey' }),
    ).toBeInTheDocument();
  });

  it('does not start playing by itself', () => {
    render(player());

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pause' }),
    ).not.toBeInTheDocument();
  });
});

describe('scrubber and speed', () => {
  it('has a labelled range with a readable value text', () => {
    render(player());
    const slider = screen.getByRole('slider', { name: 'Step' });

    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '3');
    expect(slider).toHaveValue('0');
    expect(slider).toHaveAttribute('aria-valuetext', 'Step 1 of 4: Caption 0.');
  });

  it('moving the scrubber changes the step', () => {
    render(player());
    const slider = screen.getByRole('slider', { name: 'Step' });

    fireEvent.change(slider, { target: { value: '2' } });

    expect(status()).toHaveTextContent('Caption 2.');
    expect(slider).toHaveAttribute('aria-valuetext', 'Step 3 of 4: Caption 2.');
  });

  it('has a labelled speed select with 0.5x, 1x and 2x', async () => {
    const user = userEvent.setup();
    render(player());
    const speed = screen.getByRole('combobox', { name: 'Speed' });

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['0.5x', '1x', '2x']);
    expect(speed).toHaveValue('1');

    await user.selectOptions(speed, '2x');
    expect(speed).toHaveValue('2');
  });
});

describe('keyboard', () => {
  it('ArrowRight and ArrowLeft on the focused player move steps', async () => {
    const user = userEvent.setup();
    render(player());
    screen.getByRole('group').focus();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(status()).toHaveTextContent('Caption 2.');

    await user.keyboard('{ArrowLeft}');
    expect(status()).toHaveTextContent('Caption 1.');
  });

  it('works when a button inside the player has focus', async () => {
    const user = userEvent.setup();
    render(player());
    screen.getByRole('button', { name: 'Reset' }).focus();

    await user.keyboard('{ArrowRight}');

    expect(status()).toHaveTextContent('Caption 1.');
  });

  it('Home and End jump to the first and last step', async () => {
    const user = userEvent.setup();
    render(player());
    screen.getByRole('group').focus();

    await user.keyboard('{End}');
    expect(status()).toHaveTextContent('Caption 3.');

    await user.keyboard('{Home}');
    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('does not step on the way past the ends', async () => {
    const user = userEvent.setup();
    render(player());
    screen.getByRole('group').focus();

    await user.keyboard('{ArrowLeft}');
    expect(status()).toHaveTextContent('Caption 0.');

    await user.keyboard('{End}{ArrowRight}');
    expect(status()).toHaveTextContent('Caption 3.');
  });

  it('leaves arrows alone on the scrubber (native arrows own them)', () => {
    render(player());
    const slider = screen.getByRole('slider', { name: 'Step' });

    const notHandled = fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(notHandled).toBe(true); // nobody called preventDefault
    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('leaves arrows alone on the speed select', () => {
    render(player());
    const speed = screen.getByRole('combobox', { name: 'Speed' });

    fireEvent.keyDown(speed, { key: 'ArrowRight' });
    fireEvent.keyDown(speed, { key: 'End' });

    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('ignores arrows held with Alt, Ctrl or Meta (browser shortcuts)', () => {
    render(player());
    const group = screen.getByRole('group');

    fireEvent.keyDown(group, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(group, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(group, { key: 'ArrowRight', metaKey: true });

    expect(status()).toHaveTextContent('Caption 0.');
  });

  it('is reachable by Tab', async () => {
    const user = userEvent.setup();
    render(player());

    await user.tab();

    expect(screen.getByRole('group')).toHaveFocus();
  });
});

describe('reduced motion', () => {
  it('tells render() reducedMotion is false by default', () => {
    render(player());

    expect(
      screen.getByText('Picture 0 at 0 reduced=false'),
    ).toBeInTheDocument();
  });

  it('tells render() reducedMotion is true when the visitor prefers it', () => {
    setReducedMotion(true);
    render(player());

    expect(screen.getByText('Picture 0 at 0 reduced=true')).toBeInTheDocument();
  });
});

describe('empty steps', () => {
  it('shows a friendly message, no controls, and no onFinished', () => {
    const onFinished = vi.fn();
    render(player({ steps: [], onFinished }));

    expect(screen.getByText(/Nothing to show/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('does not call caption or render', () => {
    const cap = vi.fn(caption);
    const draw = vi.fn(renderStep);
    render(player({ steps: [], caption: cap, render: draw }));

    expect(cap).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
  });
});

describe('accessibility (axe)', () => {
  it('has no violations at the start', async () => {
    const { container } = render(player());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations at the last step', async () => {
    const user = userEvent.setup();
    const { container } = render(player());
    await user.keyboard('{Tab}{End}');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations while playing', async () => {
    const user = userEvent.setup();
    const { container } = render(player());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with reduced motion, one step, or no steps', async () => {
    setReducedMotion(true);
    const one = render(player({ steps: [{ n: 0 }] }));
    expect(await axe(one.container)).toHaveNoViolations();
    one.unmount();

    const none = render(player({ steps: [] }));
    expect(await axe(none.container)).toHaveNoViolations();
  });
});

describe('StrictMode wrapper', () => {
  it('still renders and steps normally', async () => {
    const user = userEvent.setup();
    render(<StrictMode>{player()}</StrictMode>);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(status()).toHaveTextContent('Caption 1.');
  });
});
