import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { BuilderLab } from '@/labs/BuilderLab';
import {
  addDevices,
  cable,
  configure,
  fill,
  node,
} from '@/labs/builderTestKit';
import { twoPcsCanPingTask, type LabTask } from '@/labs/labTasks';
import type { Network } from '@/netcore/network';
import { simpleLan } from '@/netcore/network.fixtures';

const pcTask = () => [twoPcsCanPingTask()];

describe('onChange', () => {
  it('is not called at mount, then gets the latest network on each change', async () => {
    const onChange = vi.fn<(net: Network) => void>();
    render(<BuilderLab tasks={[]} palette={['pc']} onChange={onChange} />);
    const user = userEvent.setup();
    expect(onChange).not.toHaveBeenCalled();

    await addDevices(user, 'Add a computer');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0].devices.map((d) => d.name)).toEqual([
      'PC1',
    ]);

    await fill(user, 'IP address', '10.0.0.1');
    expect(onChange.mock.lastCall?.[0].devices[0]?.ip).toBe('10.0.0.1');

    // Selecting a device changes no network, so it is not reported.
    const calls = onChange.mock.calls.length;
    await user.click(node('PC1'));
    expect(onChange).toHaveBeenCalledTimes(calls);
  });
});

describe('onAllDone', () => {
  it('fires once, and not again after the learner breaks and re-fixes the network', async () => {
    const onAllDone = vi.fn();
    render(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        onAllDone={onAllDone}
      />,
    );
    const user = userEvent.setup();
    await solve(user);
    expect(onAllDone).toHaveBeenCalledTimes(1);

    await user.click(node('PC2'));
    await fill(user, 'IP address', '192.168.9.9');
    expect(screen.getByText('0 of 1 goals done')).toBeVisible();
    await fill(user, 'IP address', '192.168.1.20');
    expect(screen.getByText('All goals done. Nice work!')).toBeVisible();
    expect(onAllDone).toHaveBeenCalledTimes(1);
  });

  it('is not fired again when the tasks prop or callback gets a new identity', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        onAllDone={first}
      />,
    );
    const user = userEvent.setup();
    await solve(user);
    rerender(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        onAllDone={second}
      />,
    );
    rerender(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        onAllDone={second}
      />,
    );
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('fires once at mount when the starting network already passes, even in StrictMode', () => {
    const onAllDone = vi.fn();
    render(
      <StrictMode>
        <BuilderLab
          tasks={pcTask()}
          palette={['pc']}
          initial={simpleLan()}
          onAllDone={onAllDone}
        />
      </StrictMode>,
    );
    expect(onAllDone).toHaveBeenCalledTimes(1);
  });

  it('fires once in StrictMode when solved by hand', async () => {
    const onAllDone = vi.fn();
    render(
      <StrictMode>
        <BuilderLab
          tasks={pcTask()}
          palette={['pc', 'switch']}
          onAllDone={onAllDone}
        />
      </StrictMode>,
    );
    await solve(userEvent.setup());
    expect(onAllDone).toHaveBeenCalledTimes(1);
  });

  it('never fires with zero tasks', async () => {
    const onAllDone = vi.fn();
    render(<BuilderLab tasks={[]} palette={['pc']} onAllDone={onAllDone} />);
    await addDevices(userEvent.setup(), 'Add a computer');
    expect(onAllDone).not.toHaveBeenCalled();
  });

  it('keeps working when a task check throws', async () => {
    const bad: LabTask = {
      id: 'bad',
      description: 'Broken goal',
      check: () => {
        throw new Error('boom');
      },
    };
    const onAllDone = vi.fn();
    render(<BuilderLab tasks={[bad]} palette={['pc']} onAllDone={onAllDone} />);
    await addDevices(userEvent.setup(), 'Add a computer');
    expect(screen.getByText('Broken goal')).toBeVisible();
    expect(screen.getByText('Not yet')).toBeVisible();
    expect(onAllDone).not.toHaveBeenCalled();
  });
});

describe('accessibility', () => {
  it('has no axe violations when empty', async () => {
    const { container } = render(
      <BuilderLab tasks={pcTask()} palette={['pc', 'server', 'switch']} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with devices, an invalid field and a terminal open', async () => {
    const { container } = render(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        initial={simpleLan()}
      />,
    );
    const user = userEvent.setup();
    await user.click(node('PC1'));
    await fill(user, 'IP address', '999.1.1.1');
    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations while picking a second device, and for a switch', async () => {
    const { container } = render(
      <BuilderLab
        tasks={pcTask()}
        palette={['pc', 'switch']}
        initial={simpleLan()}
      />,
    );
    const user = userEvent.setup();
    await user.click(node('PC1'));
    await user.click(
      screen.getByRole('button', { name: 'Connect PC1 to another device' }),
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.keyboard('{Escape}');
    await user.click(node('SW1'));
    expect(await axe(container)).toHaveNoViolations();
  });
});

async function solve(user: ReturnType<typeof userEvent.setup>) {
  await addDevices(user, 'Add a computer', 2);
  await addDevices(user, 'Add a switch');
  await cable(user, 'PC1', 'Switch1');
  await cable(user, 'PC2', 'Switch1');
  await configure(user, 'PC1', '192.168.1.10');
  await configure(user, 'PC2', '192.168.1.20');
}
