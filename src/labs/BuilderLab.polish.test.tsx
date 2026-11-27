import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BuilderLab } from '@/labs/BuilderLab';
import { addDevices, cable, node } from '@/labs/builderTestKit';
import { twoPcsCanPingTask } from '@/labs/labTasks';
import type { DeviceKind } from '@/netcore/network';

function setup(palette: DeviceKind[] = ['pc', 'switch']) {
  render(<BuilderLab tasks={[twoPcsCanPingTask()]} palette={palette} />);
  return userEvent.setup();
}

describe('focus after removing', () => {
  it('moves focus to the next device node after Remove device', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 3);
    await user.click(node('PC2'));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(document.activeElement).toBe(node('PC3'));
    expect(screen.getByText('Removed PC2 and its cables.')).toBeVisible();
  });

  it('falls back to the previous device when the last one is removed', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await user.click(node('PC2'));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(document.activeElement).toBe(node('PC1'));
  });

  it('falls back to the first palette button when none is left', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    await user.click(node('PC1'));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Add a computer' }),
    );
  });

  it('keeps focus on the selected device after Remove cable', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 1);
    await addDevices(user, 'Add a switch');
    await cable(user, 'PC1', 'Switch1');
    await user.click(node('PC1'));
    await user.click(
      screen.getByRole('button', { name: 'Remove cable to Switch1' }),
    );
    expect(document.activeElement).toBe(node('PC1'));
    expect(
      screen.getByText('Removed the cable between PC1 and Switch1.'),
    ).toBeVisible();
  });
});

describe('selection wording', () => {
  it('announces only "Selected PC1." and keeps the hint in the panel', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    await user.click(node('PC1'));
    const live = screen
      .getAllByRole('status')
      .map((el) => el.textContent)
      .join('|');
    expect(live).toContain('Selected PC1.');
    expect(live).not.toContain('settings in the panel');
    expect(
      screen.getByRole('region', { name: 'Settings for PC1' }).textContent,
    ).toMatch(/change its settings/i);
  });

  it('gives each lab its own goals heading id', () => {
    render(
      <>
        <BuilderLab tasks={[twoPcsCanPingTask()]} palette={['pc']} />
        <BuilderLab tasks={[twoPcsCanPingTask()]} palette={['pc']} />
      </>,
    );
    const ids = screen
      .getAllByRole('heading', { name: 'Goals' })
      .map((h) => h.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getAllByRole('region', { name: 'Goals' })).toHaveLength(2);
  });
});
