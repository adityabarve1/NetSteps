import { describe, expect, it } from 'vitest';
import { ping } from './network';
import { runCommand } from './terminal';
import { labNet, lines4 } from './terminal.fixtures';

const win = (host: string, input: string) =>
  runCommand(labNet(), host, input, 'windows');

const STATS = (ip: string, received: number) => [
  '',
  `Ping statistics for ${ip}:`,
  `    Packets: Sent = 4, Received = ${String(received)}, Lost = ${String(4 - received)} (${String(received === 4 ? 0 : 100)}% loss),`,
];

describe('windows ipconfig', () => {
  it('shows the address, mask and gateway of a configured PC', () => {
    expect(win('pc1', 'ipconfig')).toEqual({
      lines: [
        'Windows IP Configuration',
        '',
        'Ethernet adapter Ethernet:',
        '',
        '   IPv4 Address. . . . . . . . . . . : 192.168.1.10',
        '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
        '   Default Gateway . . . . . . . . . : 192.168.1.1',
      ],
    });
  });

  it('leaves the gateway line out when the device has none', () => {
    const lines = win('pc2', 'ipconfig').lines;
    expect(lines).toContain(
      '   IPv4 Address. . . . . . . . . . . : 192.168.1.20',
    );
    expect(lines.join('\n')).not.toContain('Default Gateway');
  });

  it('shows a /24 mask in dotted form', () => {
    expect(win('pc2', 'ipconfig').lines).toContain(
      '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
    );
  });

  it('shows other prefix lengths in dotted form too', () => {
    const n = labNet();
    const host = n.devices.find((d) => d.id === 'pc2');
    if (host) host.mask = '/16';
    expect(runCommand(n, 'pc2', 'ipconfig', 'windows').lines).toContain(
      '   Subnet Mask . . . . . . . . . . . : 255.255.0.0',
    );
  });

  it('ignores a gateway that is not a valid address', () => {
    const n = labNet();
    const host = n.devices.find((d) => d.id === 'pc1');
    if (host) host.gateway = '999.1.1.1';
    expect(
      runCommand(n, 'pc1', 'ipconfig', 'windows').lines.join('\n'),
    ).not.toContain('Default Gateway');
  });

  it.each(['blank', 'badmask'])(
    'shows the adapter as disconnected for %s (no valid IP configuration)',
    (host) => {
      expect(win(host, 'ipconfig').lines).toEqual([
        'Windows IP Configuration',
        '',
        'Ethernet adapter Ethernet:',
        '',
        '   Media State . . . . . . . . . . . : Media disconnected',
      ]);
    },
  );

  it('works for a server', () => {
    expect(win('srv1', 'ipconfig').lines).toContain(
      '   IPv4 Address. . . . . . . . . . . : 192.168.1.30',
    );
  });

  it('explains that options are not available', () => {
    expect(win('pc1', 'ipconfig /all').lines).toEqual([
      'This practice terminal only supports plain "ipconfig", with no options.',
    ]);
  });
});

describe('windows ping: success', () => {
  it('prints the header, four replies and the statistics', () => {
    expect(win('pc1', 'ping 192.168.1.20')).toEqual({
      lines: [
        'Pinging 192.168.1.20 with 32 bytes of data:',
        ...lines4('Reply from 192.168.1.20: bytes=32 time=2ms TTL=64'),
        ...STATS('192.168.1.20', 4),
        'Approximate round trip times in milli-seconds:',
        '    Minimum = 2ms, Maximum = 2ms, Average = 2ms',
      ],
    });
  });

  it.each([
    ['c1', '172.16.0.2', 3],
    ['d1', '172.17.0.2', 1],
    ['pc1', '192.168.1.30', 2],
  ])(
    '%s -> %s replies with the time ping() reports (%i ms)',
    (host, to, ms) => {
      const rtt = ping(labNet(), host, to).rttMs;
      expect(rtt).toBe(ms);
      const lines = win(host, `ping ${to}`).lines;
      expect(lines.filter((l) => l.startsWith('Reply from'))).toEqual(
        lines4(`Reply from ${to}: bytes=32 time=${String(rtt)}ms TTL=64`),
      );
      expect(lines.at(-1)).toBe(
        `    Minimum = ${String(rtt)}ms, Maximum = ${String(rtt)}ms, Average = ${String(rtt)}ms`,
      );
    },
  );

  it('answers a ping to its own address in under 1 ms', () => {
    expect(win('pc1', 'ping 192.168.1.10').lines).toEqual([
      'Pinging 192.168.1.10 with 32 bytes of data:',
      ...lines4('Reply from 192.168.1.10: bytes=32 time<1ms TTL=64'),
      ...STATS('192.168.1.10', 4),
      'Approximate round trip times in milli-seconds:',
      '    Minimum = 0ms, Maximum = 0ms, Average = 0ms',
    ]);
  });
});

describe('windows ping: failures', () => {
  it('reports General failure when the host has no IP configuration', () => {
    expect(win('blank', 'ping 192.168.1.20').lines).toEqual([
      'Pinging 192.168.1.20 with 32 bytes of data:',
      ...lines4('General failure.'),
      ...STATS('192.168.1.20', 0),
    ]);
  });

  it('reports General failure for a mask that is not valid', () => {
    expect(win('badmask', 'ping 192.168.1.20').lines).toContain(
      'General failure.',
    );
  });

  it('reports Destination host unreachable for another network', () => {
    expect(win('pc1', 'ping 10.0.0.5').lines).toEqual([
      'Pinging 10.0.0.5 with 32 bytes of data:',
      ...lines4('Reply from 192.168.1.10: Destination host unreachable.'),
      ...STATS('10.0.0.5', 0),
    ]);
  });

  it('times out when the device is on the same network but not cabled', () => {
    expect(win('pc1', 'ping 192.168.1.40').lines).toEqual([
      'Pinging 192.168.1.40 with 32 bytes of data:',
      ...lines4('Request timed out.'),
      ...STATS('192.168.1.40', 0),
    ]);
  });

  it('treats an unowned valid address like no path: four timeouts', () => {
    expect(win('pc1', 'ping 192.168.1.99').lines).toEqual([
      'Pinging 192.168.1.99 with 32 bytes of data:',
      ...lines4('Request timed out.'),
      ...STATS('192.168.1.99', 0),
    ]);
  });

  it('never prints the round-trip lines on failure', () => {
    for (const target of ['10.0.0.5', '192.168.1.40', '192.168.1.99']) {
      expect(win('pc1', `ping ${target}`).lines.join('\n')).not.toContain(
        'Approximate',
      );
    }
  });

  it.each(['999.1.1.1', '01.2.3.4', '1.2.3', 'google.com', '1.2.3.4.5'])(
    'says it could not find the host for the unparseable target %s',
    (target) => {
      expect(win('pc1', `ping ${target}`).lines).toEqual([
        `Ping request could not find host ${target}. Please check the name and try again.`,
      ]);
    },
  );

  it('echoes an unparseable target exactly as typed (case kept)', () => {
    expect(win('pc1', 'PING Example.COM').lines).toEqual([
      'Ping request could not find host Example.COM. Please check the name and try again.',
    ]);
  });

  it.each([
    'ping',
    'ping -n 2 192.168.1.20',
    'ping -t',
    'ping /?',
    'ping 192.168.1.20 192.168.1.30',
    'ping 192.168.1.20 ; rm -rf /',
  ])('prints the usage line for "%s"', (input) => {
    expect(win('pc1', input).lines).toEqual(['Usage: ping <ip-address>']);
  });

  it('treats shell metacharacters as plain text, not as commands', () => {
    expect(win('pc1', 'ping $(whoami)').lines).toEqual([
      'Ping request could not find host $(whoami). Please check the name and try again.',
    ]);
    expect(win('pc1', 'ping 192.168.1.20|cat').lines).toEqual([
      'Ping request could not find host 192.168.1.20|cat. Please check the name and try again.',
    ]);
  });
});

describe('windows other commands', () => {
  it('clears the screen with cls', () => {
    expect(win('pc1', 'cls')).toEqual({ lines: [], clear: true });
    expect(win('pc1', 'CLS extra')).toEqual({ lines: [], clear: true });
  });

  it('does not know the unix commands', () => {
    expect(win('pc1', 'ifconfig').lines).toEqual([
      "'ifconfig' is not recognized as an internal or external command, operable program or batch file.",
    ]);
    expect(win('pc1', 'clear').lines).toEqual([
      "'clear' is not recognized as an internal or external command, operable program or batch file.",
    ]);
  });

  it('echoes an unknown command exactly as typed', () => {
    expect(win('pc1', 'Foo bar').lines).toEqual([
      "'Foo' is not recognized as an internal or external command, operable program or batch file.",
    ]);
  });

  it('lists the commands in order with a description each', () => {
    const lines = win('pc1', 'help').lines;
    const names = lines.map((l) => /^ {2}(\S+)/.exec(l)?.[1]);
    expect(names.filter(Boolean)).toEqual(['help', 'ipconfig', 'ping', 'cls']);
    expect(lines.join('\n')).not.toMatch(/ifconfig|clear/);
    expect(lines.find((l) => l.includes('ping '))).toContain('<ip-address>');
  });
});
