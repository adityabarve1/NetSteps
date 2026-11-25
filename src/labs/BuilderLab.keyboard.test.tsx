import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BuilderLab } from '@/labs/BuilderLab';
import { cables, deviceNodes, node, tabTo } from '@/labs/builderTestKit';

function setup() {
  render(<BuilderLab tasks={[]} palette={['pc', 'switch']} />);
  return userEvent.setup();
}

const connectButton = () =>
  screen.getByRole('button', { name: 'Connect PC1 to another device' });

describe('BuilderLab keyboard use', () => {
  it('builds and connects with the keyboard alone, and Escape cancels', async () => {
    const user = setup();
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Add a computer' }),
    ).toHaveFocus();
    await user.keyboard('{Enter}{Enter}');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Add a switch' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(deviceNodes()).toHaveLength(3);

    // Select PC1 with Enter, then start a cable from its panel.
    await tabTo(user, /^PC1, computer/);
    await user.keyboard('{Enter}');
    expect(node('PC1')).toHaveAttribute('aria-pressed', 'true');
    await tabTo(user, 'Connect PC1 to another device');
    await user.keyboard('{Enter}');
    expect(
      screen.getByText('Now pick the device to connect to PC1.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Cancel connecting' }),
    ).toBeVisible();

    // Escape cancels and adds nothing.
    await user.keyboard('{Escape}');
    expect(screen.getByText('Cancelled. No cable was added.')).toBeVisible();
    expect(cables()).toHaveLength(0);

    // Try again and finish it with Space on the second device.
    await user.click(connectButton());
    await tabTo(user, /^Switch1, switch/);
    await user.keyboard(' ');
    expect(screen.getByText('Connected PC1 to Switch1.')).toBeVisible();
    expect(cables()).toHaveLength(1);
  });

  it('cancels from a focused device with Escape, and picking the same device cancels', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add a computer' }));
    await user.click(connectButton());
    node('PC1').focus();
    await user.keyboard('{Escape}');
    expect(screen.getByText('Cancelled. No cable was added.')).toBeVisible();

    await user.click(connectButton());
    await user.click(node('PC1'));
    expect(screen.getByText('Cancelled. No cable was added.')).toBeVisible();
  });

  it('moves a focused device with Shift plus an arrow key, and not without Shift', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add a computer' }));
    const before = node('PC1').getAttribute('transform');
    node('PC1').focus();
    await user.keyboard('{ArrowRight}');
    expect(node('PC1').getAttribute('transform')).toBe(before);
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(node('PC1').getAttribute('transform')).not.toBe(before);
    expect(node('PC1')).toHaveFocus();
  });

  it('drags a device with the pointer, keeps it on the canvas, and a drag does not select', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add a computer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a switch' }));
    // Click PC1 first so the drag below starts from a known selection.
    fireEvent.click(node('PC1'));
    const svg = screen.getByRole('group', { name: 'Network canvas' });
    svg.getBoundingClientRect = () => new DOMRect(0, 0, 480, 340);
    expect(node('PC1').getAttribute('transform')).toBe('translate(60 50)');

    fireEvent.pointerDown(node('Switch1'), {
      button: 0,
      clientX: 180,
      clientY: 50,
      pointerId: 1,
    });
    fireEvent.pointerMove(node('Switch1'), {
      clientX: 190,
      clientY: 60,
      pointerId: 1,
    });
    fireEvent.pointerUp(node('Switch1'), { pointerId: 1 });
    fireEvent.click(node('Switch1'));
    expect(node('Switch1').getAttribute('transform')).toBe('translate(190 60)');
    expect(node('PC1')).toHaveAttribute('aria-pressed', 'true');
    expect(node('Switch1')).toHaveAttribute('aria-pressed', 'false');

    // Dragging far outside stops at the canvas edge.
    fireEvent.pointerDown(node('PC1'), {
      button: 0,
      clientX: 60,
      clientY: 50,
      pointerId: 2,
    });
    fireEvent.pointerMove(node('PC1'), {
      clientX: -900,
      clientY: 9000,
      pointerId: 2,
    });
    fireEvent.pointerUp(node('PC1'), { pointerId: 2 });
    expect(node('PC1').getAttribute('transform')).toBe('translate(52 280)');
  });
});
