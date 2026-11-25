import { describe, expect, it } from 'vitest';
import { runCommand } from './terminal';
import { labNet, lines4 } from './terminal.fixtures';

const win = (host: string, input: string) =>
  runCommand(labNet(), host, input, 'windows').lines;
const unix = (host: string, input: string) =>
  runCommand(labNet(), host, input, 'unix').lines;

const winOk = (ip: string) => [
  `Pinging ${ip} with 32 bytes of data:`,
  ...lines4(`Reply from ${ip}: bytes=32 time<1ms TTL=64`),
  '',
  `Ping statistics for ${ip}:`,
  '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),',
  'Approximate round trip times in milli-seconds:',
  '    Minimum = 0ms, Maximum = 0ms, Average = 0ms',
];
const unixOk = (ip: string) => [
  `PING ${ip} (${ip}) 56(84) bytes of data.`,
  ...[1, 2, 3, 4].map(
    (n) => `64 bytes from ${ip}: icmp_seq=${String(n)} ttl=64 time=0.05 ms`,
  ),
  '',
  `--- ${ip} ping statistics ---`,
  '4 packets transmitted, 4 received, 0% packet loss, time 3004ms',
  'rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms',
];

describe('loopback (127.0.0.0/8) ping', () => {
  it.each([
    '127.0.0.1',
    '127.0.0.0',
    '127.1.2.3',
    '127.255.255.254',
    '127.255.255.255',
  ])('succeeds as a self-ping for %s on both systems', (ip) => {
    expect(win('pc1', `ping ${ip}`)).toEqual(winOk(ip));
    expect(unix('pc1', `ping ${ip}`)).toEqual(unixOk(ip));
  });

  it.each(['blank', 'badmask'])(
    'works on %s, which has no IP configuration',
    (host) => {
      expect(win(host, 'ping 127.0.0.1')).toEqual(winOk('127.0.0.1'));
      expect(unix(host, 'ping 127.0.0.1')).toEqual(unixOk('127.0.0.1'));
    },
  );

  it('still pings the host own address as before (/24 config)', () => {
    expect(win('pc2', 'ping 192.168.1.20')).toEqual(winOk('192.168.1.20'));
    expect(unix('pc2', 'ping 192.168.1.20')).toEqual(unixOk('192.168.1.20'));
  });

  it.each(['0.0.0.0', '255.255.255.255', '128.0.0.1', '126.255.255.255'])(
    '%s is not loopback: four timeouts',
    (ip) => {
      expect(win('pc1', `ping ${ip}`)).toContain('Request timed out.');
      expect(win('pc1', `ping ${ip}`)).not.toContain(
        'Approximate round trip times in milli-seconds:',
      );
      expect(unix('pc1', `ping ${ip}`)).toContain(
        'Request timeout for icmp_seq 1',
      );
    },
  );

  it.each(['127.0.0.1;ls', '127.0.0.01', '127.0.0', 'localhost'])(
    'does not treat %s as loopback',
    (target) => {
      expect(win('pc1', `ping ${target}`)).toEqual([
        `Ping request could not find host ${target}. Please check the name and try again.`,
      ]);
    },
  );

  it('keeps usage and trimming behaviour', () => {
    expect(win('pc1', ' ping 127.0.0.1')).toEqual(winOk('127.0.0.1'));
    expect(win('pc1', 'ping 127.0.0.1 ; ls')).toEqual([
      'Usage: ping <ip-address>',
    ]);
  });

  it('keeps the friendly answers for a switch and an unknown device', () => {
    expect(win('sw1', 'ping 127.0.0.1')).toHaveLength(1);
    expect(win('nope', 'ping 127.0.0.1')).toEqual(['No such device.']);
  });
});
