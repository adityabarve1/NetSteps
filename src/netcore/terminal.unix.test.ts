import { describe, expect, it } from 'vitest';
import { ping } from './network';
import { runCommand } from './terminal';
import { labNet } from './terminal.fixtures';

const unix = (host: string, input: string) =>
  runCommand(labNet(), host, input, 'unix');

const replies = (to: string, time: string) =>
  [1, 2, 3, 4].map(
    (n) => `64 bytes from ${to}: icmp_seq=${String(n)} ttl=64 time=${time} ms`,
  );
const seq = (text: (n: number) => string) => [1, 2, 3, 4].map(text);

describe('unix ifconfig', () => {
  it('shows an eth0 block with the address and mask of a configured PC', () => {
    expect(unix('pc1', 'ifconfig')).toEqual({
      lines: [
        'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
        '        inet 192.168.1.10  netmask 255.255.255.0',
      ],
    });
  });

  it('shows a /24 mask in dotted form', () => {
    expect(unix('pc2', 'ifconfig').lines).toContain(
      '        inet 192.168.1.20  netmask 255.255.255.0',
    );
  });

  it('does not show a gateway (ifconfig never does)', () => {
    expect(unix('pc1', 'ifconfig').lines.join('\n')).not.toMatch(
      /192\.168\.1\.1\b/,
    );
  });

  it.each(['blank', 'badmask'])(
    'shows eth0 without an inet line for %s (no valid IP configuration)',
    (host) => {
      expect(unix(host, 'ifconfig').lines).toEqual([
        'eth0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500',
      ]);
    },
  );

  it('explains that options are not available', () => {
    expect(unix('pc1', 'ifconfig -a').lines).toEqual([
      'This practice terminal only supports plain "ifconfig", with no options.',
    ]);
  });
});

describe('unix ping: success', () => {
  it('prints the header, four replies and the statistics', () => {
    expect(unix('pc1', 'ping 192.168.1.20')).toEqual({
      lines: [
        'PING 192.168.1.20 (192.168.1.20) 56(84) bytes of data.',
        ...replies('192.168.1.20', '2'),
        '',
        '--- 192.168.1.20 ping statistics ---',
        '4 packets transmitted, 4 received, 0% packet loss, time 3004ms',
        'rtt min/avg/max/mdev = 2.000/2.000/2.000/0.000 ms',
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
      const lines = unix(host, `ping ${to}`).lines;
      expect(lines.filter((l) => l.startsWith('64 bytes'))).toEqual(
        replies(to, String(rtt)),
      );
      const t = rtt.toFixed(3);
      expect(lines.at(-1)).toBe(
        `rtt min/avg/max/mdev = ${t}/${t}/${t}/0.000 ms`,
      );
    },
  );

  it('answers a ping to its own address with time=0.05 ms', () => {
    expect(unix('pc1', 'ping 192.168.1.10').lines).toEqual([
      'PING 192.168.1.10 (192.168.1.10) 56(84) bytes of data.',
      ...replies('192.168.1.10', '0.05'),
      '',
      '--- 192.168.1.10 ping statistics ---',
      '4 packets transmitted, 4 received, 0% packet loss, time 3004ms',
      'rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms',
    ]);
  });
});

describe('unix ping: failures', () => {
  it('says the network is unreachable when the host has no IP configuration', () => {
    expect(unix('blank', 'ping 192.168.1.20').lines).toEqual([
      'ping: connect: Network is unreachable',
    ]);
    expect(unix('badmask', 'ping 192.168.1.20').lines).toEqual([
      'ping: connect: Network is unreachable',
    ]);
  });

  it('reports Destination Host Unreachable for another network', () => {
    expect(unix('pc1', 'ping 10.0.0.5').lines).toEqual([
      'PING 10.0.0.5 (10.0.0.5) 56(84) bytes of data.',
      ...seq(
        (n) =>
          `From 192.168.1.10 icmp_seq=${String(n)} Destination Host Unreachable`,
      ),
      '',
      '--- 10.0.0.5 ping statistics ---',
      '4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3004ms',
    ]);
  });

  it.each(['192.168.1.40', '192.168.1.99'])(
    'times out for %s (not cabled, or nobody owns it)',
    (target) => {
      expect(unix('pc1', `ping ${target}`).lines).toEqual([
        `PING ${target} (${target}) 56(84) bytes of data.`,
        ...seq((n) => `Request timeout for icmp_seq ${String(n)}`),
        '',
        `--- ${target} ping statistics ---`,
        '4 packets transmitted, 0 received, 100% packet loss, time 3004ms',
      ]);
    },
  );

  it.each(['999.1.1.1', '01.2.3.4', 'google.com'])(
    'says the name is not known for the unparseable target %s',
    (target) => {
      expect(unix('pc1', `ping ${target}`).lines).toEqual([
        `ping: ${target}: Name or service not known`,
      ]);
    },
  );

  it.each([
    'ping',
    'ping -c 1 192.168.1.20',
    'ping 192.168.1.20 192.168.1.30',
    'ping 192.168.1.20 ; rm -rf /',
  ])('prints the usage line for "%s"', (input) => {
    expect(unix('pc1', input).lines).toEqual(['Usage: ping <ip-address>']);
  });

  it('treats shell metacharacters as plain text, not as commands', () => {
    expect(unix('pc1', 'ping $(whoami)').lines).toEqual([
      'ping: $(whoami): Name or service not known',
    ]);
    expect(unix('pc1', 'ping 192.168.1.20|cat').lines).toEqual([
      'ping: 192.168.1.20|cat: Name or service not known',
    ]);
  });
});

describe('unix other commands', () => {
  it('clears the screen with clear', () => {
    expect(unix('pc1', 'clear')).toEqual({ lines: [], clear: true });
    expect(unix('pc1', 'CLEAR extra')).toEqual({ lines: [], clear: true });
  });

  it('does not know the windows commands', () => {
    expect(unix('pc1', 'ipconfig').lines).toEqual([
      'ipconfig: command not found',
    ]);
    expect(unix('pc1', 'cls').lines).toEqual(['cls: command not found']);
  });

  it('echoes an unknown command exactly as typed', () => {
    expect(unix('pc1', 'Foo bar').lines).toEqual(['Foo: command not found']);
  });

  it('lists the commands in order with a description each', () => {
    const lines = unix('pc1', 'help').lines;
    const names = lines.map((l) => /^ {2}(\S+)/.exec(l)?.[1]);
    expect(names.filter(Boolean)).toEqual([
      'help',
      'ifconfig',
      'ping',
      'clear',
    ]);
    expect(lines.join('\n')).not.toMatch(/ipconfig|cls/);
  });
});
