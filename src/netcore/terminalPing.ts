// The text that `ping` prints in the practice terminal. Pure TypeScript: it
// only formats what `ping` (network.ts) reports, so nothing here touches a
// real network, a clock or a random number.

import { formatIPv4, parseIPv4 } from './ipv4';
import { ping } from './network';
import type { Device, Network } from './network';
import type { TerminalOs } from './terminal';

type Outcome =
  | { kind: 'ok'; rttMs: number }
  | { kind: 'no-config' }
  | { kind: 'unreachable'; from: string }
  | { kind: 'timeout' };

const PACKETS = 4;
const times = (make: (n: number) => string): string[] =>
  Array.from({ length: PACKETS }, (_, i) => make(i + 1));

function windowsLines(target: string, outcome: Outcome): string[] {
  const received = outcome.kind === 'ok' ? PACKETS : 0;
  const replies = ((): string[] => {
    switch (outcome.kind) {
      case 'ok': {
        const time =
          outcome.rttMs === 0 ? 'time<1ms' : `time=${String(outcome.rttMs)}ms`;
        return times(() => `Reply from ${target}: bytes=32 ${time} TTL=64`);
      }
      case 'no-config':
        return times(() => 'General failure.');
      case 'unreachable':
        return times(
          () => `Reply from ${outcome.from}: Destination host unreachable.`,
        );
      case 'timeout':
        return times(() => 'Request timed out.');
    }
  })();
  const lines = [
    `Pinging ${target} with 32 bytes of data:`,
    ...replies,
    '',
    `Ping statistics for ${target}:`,
    `    Packets: Sent = ${String(PACKETS)}, Received = ${String(received)}, Lost = ${String(PACKETS - received)} (${received === 0 ? '100' : '0'}% loss),`,
  ];
  if (outcome.kind === 'ok') {
    const ms = `${String(outcome.rttMs)}ms`;
    lines.push(
      'Approximate round trip times in milli-seconds:',
      `    Minimum = ${ms}, Maximum = ${ms}, Average = ${ms}`,
    );
  }
  return lines;
}

function unixLines(target: string, outcome: Outcome): string[] {
  if (outcome.kind === 'no-config')
    return ['ping: connect: Network is unreachable'];
  // A ping to yourself takes a fraction of a millisecond; 0.05 ms is typical.
  const ms = outcome.kind === 'ok' && outcome.rttMs > 0 ? outcome.rttMs : 0.05;
  const replies = ((): string[] => {
    switch (outcome.kind) {
      case 'ok':
        return times(
          (n) =>
            `64 bytes from ${target}: icmp_seq=${String(n)} ttl=64 time=${String(ms)} ms`,
        );
      case 'unreachable':
        return times(
          (n) =>
            `From ${outcome.from} icmp_seq=${String(n)} Destination Host Unreachable`,
        );
      default:
        return times((n) => `Request timeout for icmp_seq ${String(n)}`);
    }
  })();
  const received = outcome.kind === 'ok' ? PACKETS : 0;
  const errors =
    outcome.kind === 'unreachable' ? `, +${String(PACKETS)} errors` : '';
  const lines = [
    `PING ${target} (${target}) 56(84) bytes of data.`,
    ...replies,
    '',
    `--- ${target} ping statistics ---`,
    `${String(PACKETS)} packets transmitted, ${String(received)} received${errors}, ${received === 0 ? '100' : '0'}% packet loss, time 3004ms`,
  ];
  if (outcome.kind === 'ok') {
    const t = ms.toFixed(3);
    lines.push(`rtt min/avg/max/mdev = ${t}/${t}/${t}/0.000 ms`);
  }
  return lines;
}

const isLoopback = (ip: number): boolean => Math.floor(ip / 16777216) === 127;

function outcomeOf(net: Network, host: Device, target: string): Outcome {
  const result = ping(net, host.id, target);
  if (result.ok) return { kind: 'ok', rttMs: result.rttMs };
  switch (result.failure) {
    case 'no-ip-config':
      return { kind: 'no-config' };
    case 'different-network': {
      const ip = parseIPv4(host.ip ?? '');
      // `ping` only reports this failure for a source with a valid address.
      return ip === null
        ? { kind: 'no-config' }
        : { kind: 'unreachable', from: formatIPv4(ip) };
    }
    default:
      // `no-path`, and a valid address nobody owns (`unknown-host`): the
      // packets leave and nothing answers.
      return { kind: 'timeout' };
  }
}

/**
 * The output of `ping <rawTarget>` run on `host`. `rawTarget` is one word,
 * exactly as typed. An unparseable target is a "could not find host" message
 * (the user's text is echoed as typed); a valid address is echoed in its
 * canonical dotted form.
 */
export function pingLines(
  net: Network,
  host: Device,
  rawTarget: string,
  os: TerminalOs,
): string[] {
  const parsed = parseIPv4(rawTarget);
  if (parsed === null) {
    return os === 'windows'
      ? [
          `Ping request could not find host ${rawTarget}. Please check the name and try again.`,
        ]
      : [`ping: ${rawTarget}: Name or service not known`];
  }
  const target = formatIPv4(parsed);
  // 127.0.0.0/8 is loopback: every host can reach itself there, configured
  // or not. `ping` (network.ts) knows nothing about it, so handle it here.
  const outcome: Outcome = isLoopback(parsed)
    ? { kind: 'ok', rttMs: 0 }
    : outcomeOf(net, host, target);
  return os === 'windows'
    ? windowsLines(target, outcome)
    : unixLines(target, outcome);
}
