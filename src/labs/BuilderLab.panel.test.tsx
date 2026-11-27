import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BuilderLab } from '@/labs/BuilderLab';
import {
  addDevices,
  cable,
  cables,
  configure,
  deviceNodes,
  fill,
  node,
} from '@/labs/builderTestKit';
import { twoPcsCanPingTask } from '@/labs/labTasks';
import type { DeviceKind, Network } from '@/netcore/network';
import { simpleLan } from '@/netcore/network.fixtures';

const tasks = [twoPcsCanPingTask()];

function setup(palette: DeviceKind[] = ['pc', 'switch'], initial?: Network) {
  render(<BuilderLab tasks={tasks} palette={palette} initial={initial} />);
  return userEvent.setup();
}

const terminalBox = () => screen.getByLabelText('Command line');

async function run(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(terminalBox());
  await user.paste(text);
  await user.keyboard('{Enter}');
}

describe('removing cables and devices', () => {
  it('removes one cable from the side panel', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');

    await user.click(node('PC1'));
    await user.click(
      screen.getByRole('button', { name: 'Remove cable to Switch1' }),
    );
    expect(cables()).toHaveLength(1);
    expect(
      screen.getByText('Removed the cable between PC1 and Switch1.'),
    ).toBeVisible();
  });

  it('removes a device and every cable on it', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');

    await user.click(node('Switch1'));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(deviceNodes()).toHaveLength(2);
    expect(cables()).toHaveLength(0);
    expect(screen.getByText('Removed Switch1 and its cables.')).toBeVisible();
    expect(screen.getByText(/Select a device on the canvas/)).toBeVisible();
  });
});

describe('the device panel', () => {
  it('has labelled address fields for a computer, with a gateway', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    for (const label of ['IP address', 'Subnet mask', 'Gateway (optional)']) {
      const box = screen.getByLabelText(label);
      expect(box).toHaveAttribute('autocomplete', 'off');
      expect(box).toHaveAttribute('spellcheck', 'false');
      expect(box).toHaveAttribute('maxlength', '64');
    }
  });

  it('shows no address fields and no terminal for a switch', async () => {
    const user = setup();
    await addDevices(user, 'Add a switch');
    expect(screen.queryByLabelText('IP address')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Open terminal' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/A switch has no address of its own/),
    ).toBeVisible();
  });

  it('keeps what was typed and shows a friendly hint while it is not valid', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    await fill(user, 'IP address', '999.1.1.1');

    const box = screen.getByLabelText('IP address');
    expect(box).toHaveValue('999.1.1.1');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    const hint = screen.getByText(/That is not a valid IPv4 address yet/);
    expect(box.getAttribute('aria-describedby')).toContain(hint.id);
    expect(node('PC1')).toHaveAccessibleName('PC1, computer, IP not valid yet');

    await fill(user, 'IP address', '192.168.1.10');
    expect(box).toHaveAttribute('aria-invalid', 'false');
    expect(
      screen.queryByText(/That is not a valid IPv4 address yet/),
    ).toBeNull();
    expect(node('PC1')).toHaveAccessibleName('PC1, computer, IP 192.168.1.10');

    await fill(user, 'Subnet mask', '255.0.255.0');
    expect(screen.getByText(/not a valid subnet mask yet/)).toBeVisible();
    await fill(user, 'Subnet mask', '/24');
    expect(screen.queryByText(/not a valid subnet mask yet/)).toBeNull();
  });
});

describe('the practice terminal', () => {
  it('runs ping against the current network and follows later changes', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');
    await configure(user, 'PC2', '192.168.1.20');
    await configure(user, 'PC1', '192.168.1.10');

    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    expect(
      screen.getByRole('heading', { name: 'Terminal on PC1' }),
    ).toBeVisible();
    await run(user, 'ping 192.168.1.20');
    const log = screen.getByRole('log', { name: 'Terminal output' });
    expect(log).toHaveTextContent('Reply from 192.168.1.20: bytes=32');
    expect(log).toHaveTextContent('Lost = 0 (0% loss)');

    // Pull a cable: the same terminal now sees the broken network.
    await user.click(
      screen.getByRole('button', { name: 'Remove cable to Switch1' }),
    );
    await run(user, 'ping 192.168.1.20');
    expect(log).toHaveTextContent('Request timed out.');
    expect(log).toHaveTextContent('Lost = 4 (100% loss)');
  });

  it('opens and closes, and uses the os prop', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    const open = screen.getByRole('button', { name: 'Open terminal' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    await user.click(open);
    expect(
      screen.getByRole('button', { name: 'Close terminal' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await run(user, 'ipconfig');
    expect(screen.getByRole('log')).toHaveTextContent(
      'Windows IP Configuration',
    );
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    expect(screen.queryByLabelText('Command line')).toBeNull();
  });

  it('uses a unix terminal when asked', async () => {
    render(
      <BuilderLab
        tasks={[]}
        palette={['pc']}
        os="unix"
        initial={simpleLan()}
      />,
    );
    const user = userEvent.setup();
    await user.click(node('PC1'));
    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    await run(user, 'ifconfig');
    expect(screen.getByRole('log')).toHaveTextContent('inet 192.168.1.10');
  });

  it('closes the terminal when its device is removed', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(screen.queryByLabelText('Command line')).toBeNull();
  });
});

describe('limits and odd input', () => {
  it('disables the palette at 12 devices and says why', async () => {
    const user = setup(['pc']);
    await addDevices(user, 'Add a computer', 12);
    expect(deviceNodes()).toHaveLength(12);
    expect(
      screen.getByRole('button', { name: 'Add a computer' }),
    ).toBeDisabled();
    expect(screen.getByText(/The canvas holds up to 12 devices/)).toBeVisible();
    await user.click(node('PC12'));
    await user.click(screen.getByRole('button', { name: 'Remove device' }));
    expect(
      screen.getByRole('button', { name: 'Add a computer' }),
    ).toBeEnabled();
    expect(screen.queryByText(/The canvas holds up to/)).toBeNull();
  });

  it('shows a note and no add buttons for an empty palette', () => {
    setup([]);
    expect(screen.getByText('This lab has no devices to add.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Add a/ })).toBeNull();
    expect(screen.getByText('Add a device to get started.')).toBeVisible();
  });

  it('ignores unknown and repeated palette kinds', () => {
    setup([
      'pc',
      'router',
      'pc',
      'switch',
      'switch',
    ] as unknown as DeviceKind[]);
    expect(screen.getAllByRole('button', { name: /^Add a/ })).toHaveLength(2);
  });

  it('starts from a given network and survives a hostile one', () => {
    setup(['pc'], simpleLan());
    expect(deviceNodes()).toHaveLength(3);
    expect(node('PC1')).toHaveAccessibleName('PC1, computer, IP 192.168.1.10');
    expect(cables()).toHaveLength(2);
  });

  it('repairs a hostile initial network instead of crashing', () => {
    const hostile = {
      devices: [
        { id: 'a', kind: 'pc', name: 'A', x: NaN, y: 1e9 },
        { id: 'a', kind: 'pc', name: 'A again', x: 0, y: 0 },
        { id: 'b', kind: 'router', name: 'B', x: 0, y: 0 },
      ],
      links: [
        { id: 'l1', a: 'a', b: 'ghost' },
        { id: 'l2', a: 'a', b: 'a' },
      ],
    } as unknown as Network;
    setup(['pc'], hostile);
    expect(deviceNodes()).toHaveLength(1);
    expect(cables()).toHaveLength(0);
  });
});

describe('live regions and the right host', () => {
  const statusWith = (text: string) =>
    screen.getAllByRole('status').find((el) => el.textContent.includes(text));

  it('announces connect mode in a polite status region', async () => {
    const user = setup();
    await addDevices(user, 'Add a computer');
    await user.click(
      screen.getByRole('button', { name: 'Connect PC1 to another device' }),
    );
    expect(statusWith('Now pick the device to connect to PC1.')).toBeDefined();
  });

  it('announces goal completion in a status region', () => {
    setup(['pc'], simpleLan());
    expect(statusWith('All goals done')).toBeDefined();
  });

  it('runs the terminal against the device it was opened on', async () => {
    const user = setup(['pc'], simpleLan());
    await user.click(node('PC2'));
    await user.click(screen.getByRole('button', { name: 'Open terminal' }));
    expect(
      screen.getByRole('heading', { name: 'Terminal on PC2' }),
    ).toBeVisible();
    await run(user, 'ipconfig');
    const log = screen.getByRole('log', { name: 'Terminal output' });
    expect(log).toHaveTextContent('192.168.1.20');
    expect(log).not.toHaveTextContent('192.168.1.10');
  });
});
