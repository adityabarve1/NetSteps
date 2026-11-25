import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BuilderLab } from '@/labs/BuilderLab';
import {
  addDevices,
  cable,
  cables,
  configure,
  deviceNodes,
  node,
} from '@/labs/builderTestKit';
import { twoPcsCanPingTask } from '@/labs/labTasks';

const tasks = [twoPcsCanPingTask()];

function setup(onAllDone?: () => void) {
  render(
    <BuilderLab
      tasks={tasks}
      palette={['pc', 'switch']}
      onAllDone={onAllDone}
    />,
  );
  return userEvent.setup();
}

describe('BuilderLab basics', () => {
  it('shows the safety note, the palette, the hint and the empty state', () => {
    setup();
    expect(
      screen.getByText(
        'Everything here is a simulation. Nothing you do touches your real network.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Add a computer' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add a switch' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Add a server' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Add a computer to get started.')).toBeVisible();
    expect(screen.getByText(/press its Connect button/)).toBeVisible();
    expect(deviceNodes()).toHaveLength(0);
  });

  it('adds two PCs and a switch from the palette and cables them up', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    expect(deviceNodes()).toHaveLength(3);
    expect(node('PC1')).toHaveAccessibleName('PC1, computer, no IP yet');
    expect(node('Switch1')).toHaveAccessibleName('Switch1, switch');
    expect(screen.queryByText(/Add a computer to get started/)).toBeNull();

    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');
    expect(cables()).toHaveLength(2);
    expect(
      screen.getByRole('img', { name: 'Cable between PC1 and Switch1' }),
    ).toBeInTheDocument();
  });

  it('selects the device it just added and announces it', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    expect(node('PC1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Added PC1.')).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Settings for PC1' }),
    ).toBeVisible();
  });

  it('tells the learner when a cable cannot be added', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await cable(user, 'PC1', 'PC2');
    expect(screen.getByText('Connected PC1 to PC2.')).toBeVisible();
    await cable(user, 'PC1', 'PC2');
    expect(
      screen.getByText('PC1 and PC2 already have a cable between them.'),
    ).toBeVisible();
    await addDevices(user, 'Add a computer');
    await cable(user, 'PC3', 'PC1');
    expect(screen.getByText(/PC1 cannot take another cable/)).toBeVisible();
    expect(cables()).toHaveLength(1);
  });
});

describe('the goal checklist', () => {
  it('ticks when two PCs on the same subnet are cabled through a switch', async () => {
    const onAllDone = vi.fn();
    const user = setup(onAllDone);
    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    expect(screen.getByText('0 of 1 goals done')).toBeVisible();
    expect(screen.getByText('Not yet')).toBeVisible();

    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');
    await configure(user, 'PC1', '192.168.1.10');
    expect(onAllDone).not.toHaveBeenCalled();
    await configure(user, 'PC2', '192.168.1.20', '255.255.255.0');

    expect(screen.getByText('All goals done. Nice work!')).toBeVisible();
    expect(screen.getByText('Done')).toBeVisible();
    expect(onAllDone).toHaveBeenCalledTimes(1);
  });

  it('shows the goal text, and no checklist when there are no tasks', () => {
    const { unmount } = render(<BuilderLab tasks={[]} palette={['pc']} />);
    expect(screen.queryByText(/goals done/)).toBeNull();
    unmount();
    render(<BuilderLab tasks={tasks} palette={['pc']} />);
    expect(screen.getByText('Two computers can ping each other')).toBeVisible();
  });
});
