import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { TerminalLab } from '@/labs/TerminalLab';
import { MAX_SCROLLBACK } from '@/labs/terminalReducer';
import { labNet } from '@/netcore/terminal.fixtures';

type UserEvent = ReturnType<typeof userEvent.setup>;

const box = () => screen.getByLabelText('Command line');
const log = () => screen.getByRole('log', { name: 'Terminal output' });
const logText = () => log().textContent;
// An echoed command is a div holding the prompt (in a span) and the typed text.
const echoes = (text: string) =>
  within(log()).queryAllByText(
    (_, el) => el instanceof HTMLDivElement && el.textContent === text,
  );
const echo = (text: string): HTMLElement => {
  const [first] = echoes(text);
  if (first === undefined) throw new Error(`No echo of "${text}"`);
  return first;
};

async function submit(user: UserEvent, text: string) {
  await user.click(box());
  if (text !== '') await user.paste(text);
  await user.keyboard('{Enter}');
}

describe('TerminalLab basics', () => {
  it('has a labelled command line, a log region and the practice note', () => {
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    expect(box()).toBeVisible();
    expect(log()).toBeInTheDocument();
    expect(
      screen.getByText(
        'This is a practice terminal. It only works inside this lesson and never touches your real network.',
      ),
    ).toBeVisible();
  });

  it('turns off autocomplete, autocorrect and spellcheck on the input', () => {
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    expect(box()).toHaveAttribute('autocomplete', 'off');
    expect(box()).toHaveAttribute('autocapitalize', 'off');
    expect(box()).toHaveAttribute('autocorrect', 'off');
    expect(box()).toHaveAttribute('spellcheck', 'false');
  });

  it('uses the Windows prompt by default and the Unix prompt for unix', () => {
    const { unmount } = render(
      <TerminalLab net={labNet()} hostId="pc1" os="windows" />,
    );
    expect(screen.getByText('C:\\>')).toBeVisible();
    unmount();

    render(<TerminalLab net={labNet()} hostId="pc1" os="unix" />);
    expect(screen.getByText('$')).toBeVisible();
    expect(screen.queryByText('C:\\>')).not.toBeInTheDocument();
  });

  it('accepts a custom prompt', () => {
    render(<TerminalLab net={labNet()} hostId="pc1" os="unix" prompt="pc1$" />);

    expect(screen.getByText('pc1$')).toBeVisible();
  });

  it('runs a command on Enter, echoing it and appending the output', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    await submit(user, 'ping 192.168.1.20');

    const inside = within(log());
    expect(echo('C:\\> ping 192.168.1.20')).toBeVisible();
    expect(
      inside.getByText('Pinging 192.168.1.20 with 32 bytes of data:'),
    ).toBeVisible();
    expect(
      inside.getAllByText('Reply from 192.168.1.20: bytes=32 time=2ms TTL=64'),
    ).toHaveLength(4);
    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
  });

  it('shows Unix output for unix', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="unix" />);

    await submit(user, 'ifconfig');

    expect(logText()).toContain('inet 192.168.1.10  netmask 255.255.255.0');
  });

  it('echoes an empty Enter as a bare prompt', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    await submit(user, '');

    expect(logText()).toBe('C:\\>');
  });

  it('keeps leading spaces in the output', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    await submit(user, 'ipconfig');

    const line = [...log().querySelectorAll('div')].find((d) =>
      d.textContent.includes('IPv4 Address'),
    );
    expect(line?.textContent).toBe(
      '   IPv4 Address. . . . . . . . . . . : 192.168.1.10',
    );
  });

  it('empties the scrollback on cls', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    await submit(user, 'ping 192.168.1.20');
    await submit(user, 'cls');

    expect(logText()).toBe('');
  });

  it('focuses the input when the terminal is clicked', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'help');
    await user.click(document.body);
    expect(box()).not.toHaveFocus();

    await user.click(echo('C:\\> help'));

    expect(box()).toHaveFocus();
  });

  it('reads the latest network on every command', async () => {
    const user = userEvent.setup();
    const first = labNet();
    const { rerender } = render(
      <TerminalLab net={first} hostId="pc1" os="windows" />,
    );
    await submit(user, 'ipconfig');
    expect(logText()).toContain('192.168.1.10');

    const second = labNet();
    const host = second.devices.find((d) => d.id === 'pc1');
    if (host) host.ip = '192.168.1.77';
    rerender(<TerminalLab net={second} hostId="pc1" os="windows" />);
    await submit(user, 'ipconfig');

    expect(logText()).toContain('192.168.1.77');
  });

  it('says "No such device." for an unknown host', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="ghost" os="unix" />);

    await submit(user, 'help');

    expect(within(log()).getByText('No such device.')).toBeVisible();
  });

  it('shows hostile text as plain text and does not crash', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);

    await submit(user, '<img src=x onerror=alert(1)>');
    await submit(user, 'ping $(whoami)');
    await submit(user, 'x'.repeat(250));
    await submit(user, '\u0000\u0007 ping 1.1.1.1');

    expect(log().querySelector('img')).toBeNull();
    expect(logText()).toContain("'<img' is not recognized");
    expect(logText()).toContain('Ping request could not find host $(whoami).');
    expect(box()).toHaveFocus();
  });
});

describe('TerminalLab history', () => {
  it('recalls older commands with ArrowUp and stays at the oldest', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'help');
    await submit(user, 'ipconfig');

    await user.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('ipconfig');
    await user.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('help');
    await user.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('help');
  });

  it('moves forward with ArrowDown and restores the unsent draft', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'help');
    await submit(user, 'ipconfig');
    await user.paste('ping half');

    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(box()).toHaveValue('help');
    await user.keyboard('{ArrowDown}');
    expect(box()).toHaveValue('ipconfig');
    await user.keyboard('{ArrowDown}');
    expect(box()).toHaveValue('ping half');
  });

  it('runs a recalled command again with Enter', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'ipconfig');

    await user.keyboard('{ArrowUp}{Enter}');

    expect(echoes('C:\\> ipconfig')).toHaveLength(2);
  });

  it('does not store the same command twice in a row', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'help');
    await submit(user, 'ipconfig');
    await submit(user, 'ipconfig');

    await user.keyboard('{ArrowUp}{ArrowUp}');

    expect(box()).toHaveValue('help');
  });

  it('keeps only the newest 100 commands', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="unix" />);
    for (let i = 1; i <= 105; i += 1) await submit(user, `x${String(i)}`);

    await user.keyboard('{ArrowUp>101/}');

    expect(box()).toHaveValue('x6');
  }, 30000);
});

describe('TerminalLab scrollback', () => {
  it('drops the oldest lines past the cap', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await submit(user, 'help');
    for (let i = 0; i < 45; i += 1) await submit(user, 'ping 192.168.1.20');

    expect(log().children.length).toBeLessThanOrEqual(MAX_SCROLLBACK);
    expect(log().children.length).toBeGreaterThan(MAX_SCROLLBACK - 20);
    expect(echoes('C:\\> help')).toHaveLength(0);
  }, 30000);
});

describe('TerminalLab accessibility', () => {
  it('has no axe violations with output on screen', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TerminalLab net={labNet()} hostId="pc1" os="windows" />,
    );
    await submit(user, 'ping 192.168.1.20');
    await submit(user, 'ping 10.0.0.5');

    expect(await axe(container)).toHaveNoViolations();
  });
});
