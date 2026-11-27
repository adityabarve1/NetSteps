import { describe, expect, it } from 'vitest';
import type { Network } from './network';
import { runCommand } from './terminal';
import type { TerminalOs } from './terminal';
import { labNet } from './terminal.fixtures';

const oses: TerminalOs[] = ['windows', 'unix'];
const PING_OK = (os: TerminalOs) =>
  runCommand(labNet(), 'pc1', 'ping 192.168.1.20', os).lines;
const SWITCH_TEXT =
  'This device has no command line. Open a terminal on a PC or a server.';

describe.each(oses)('runCommand parsing (%s)', (os) => {
  const run = (input: string) => runCommand(labNet(), 'pc1', input, os);

  it.each(['', ' ', '   ', '\t', ' \n ', ' '])(
    'gives no lines for blank input %j',
    (input) => {
      expect(run(input)).toEqual({ lines: [] });
    },
  );

  const notStrings: unknown[] = [undefined, null, 5, {}, ['ping'], true];
  it.each(notStrings)('gives no lines for non-string input %j', (input) => {
    // A hostile caller can pass anything, whatever the types say.
    expect(run(input as string)).toEqual({ lines: [] });
  });

  it('trims the input', () => {
    expect(run('   ping 192.168.1.20   ').lines).toEqual(PING_OK(os));
    expect(run('\tping 192.168.1.20\t').lines).toEqual(PING_OK(os));
  });

  it('matches command names case-insensitively', () => {
    for (const typed of ['PING', 'Ping', 'pInG']) {
      expect(run(`${typed} 192.168.1.20`).lines).toEqual(PING_OK(os));
    }
  });

  it('collapses runs of whitespace between words', () => {
    expect(run('ping     192.168.1.20').lines).toEqual(PING_OK(os));
    expect(run('ping \t 192.168.1.20').lines).toEqual(PING_OK(os));
  });

  it('echoes the canonical dotted form of a valid address', () => {
    expect(run('ping 192.168.1.20').lines[0]).toContain('192.168.1.20');
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'treats %s as an unknown command',
    (name) => {
      expect(run(name).lines).toHaveLength(1);
      expect(run(name).lines[0]).toContain(name);
      expect(run(`${name} 1.2.3.4`).clear).toBeUndefined();
    },
  );

  it('does not set `clear` on ordinary results', () => {
    expect(run('ping 192.168.1.20')).not.toHaveProperty('clear');
    expect(run('help')).not.toHaveProperty('clear');
  });

  it('ignores extra words after help', () => {
    expect(run('help me please').lines).toEqual(run('help').lines);
  });
});

describe('long and control-character input', () => {
  const tooLong = 'a'.repeat(201);

  it('rejects over-long input with a per-OS message', () => {
    expect(runCommand(labNet(), 'pc1', tooLong, 'windows').lines).toEqual([
      'The syntax of the command is incorrect.',
    ]);
    expect(runCommand(labNet(), 'pc1', tooLong, 'unix').lines).toEqual([
      'bash: syntax error: input is too long or has invalid characters',
    ]);
  });

  it('accepts a 200-character command name (it is just unknown)', () => {
    const name = 'a'.repeat(200);
    expect(runCommand(labNet(), 'pc1', name, 'unix').lines).toEqual([
      `${name}: command not found`,
    ]);
  });

  it('counts the length after trimming', () => {
    expect(
      runCommand(labNet(), 'pc1', `${' '.repeat(500)}help`, 'unix').lines[0],
    ).toBe('Commands you can use in this practice terminal:');
    expect(runCommand(labNet(), 'pc1', ' '.repeat(500), 'unix')).toEqual({
      lines: [],
    });
  });

  it.each([
    'ping 192.168.1.20\u0000',
    'ping 192.168.1.20\u0007\u0007',
    'ping \u001b[31m192.168.1.20',
    'ping 192.168.1.20\u0085',
    'ping 192.168.1.20\u007f',
  ])('rejects control characters in %j', (input) => {
    expect(runCommand(labNet(), 'pc1', input, 'windows').lines).toEqual([
      'The syntax of the command is incorrect.',
    ]);
    expect(runCommand(labNet(), 'pc1', input, 'unix').lines).toEqual([
      'bash: syntax error: input is too long or has invalid characters',
    ]);
  });
});

describe('unknown and special hosts', () => {
  it.each(oses)('returns "No such device." for an unknown host (%s)', (os) => {
    for (const input of [
      'ping 192.168.1.20',
      'help',
      'whatever',
      'clear',
      'cls',
    ]) {
      expect(runCommand(labNet(), 'nope', input, os)).toEqual({
        lines: ['No such device.'],
      });
    }
    expect(runCommand(labNet(), '__proto__', 'help', os).lines).toEqual([
      'No such device.',
    ]);
    expect(runCommand(labNet(), '', 'help', os).lines).toEqual([
      'No such device.',
    ]);
  });

  it('still gives no lines for blank input on an unknown host', () => {
    expect(runCommand(labNet(), 'nope', '  ', 'windows')).toEqual({
      lines: [],
    });
  });

  it.each([
    ['windows', 'ipconfig'],
    ['unix', 'ifconfig'],
    ['windows', 'ping 192.168.1.20'],
    ['unix', 'help'],
  ] as const)('a switch has no command line (%s %s)', (os, input) => {
    expect(runCommand(labNet(), 'sw1', input, os)).toEqual({
      lines: [SWITCH_TEXT],
    });
  });

  it('gives no lines for blank input on a switch', () => {
    expect(runCommand(labNet(), 'sw1', '', 'windows')).toEqual({ lines: [] });
  });

  it('reads the first device when ids are duplicated, like ping does', () => {
    const n: Network = labNet();
    n.devices.push({ id: 'pc1', kind: 'switch', name: 'dup', x: 0, y: 0 });
    expect(runCommand(n, 'pc1', 'ipconfig', 'windows').lines).toContain(
      '   IPv4 Address. . . . . . . . . . . : 192.168.1.10',
    );
  });
});

describe('purity', () => {
  it.each(oses)(
    'is deterministic and does not change the network (%s)',
    (os) => {
      const n = labNet();
      const before = structuredClone(n);
      const inputs = [
        'ping 192.168.1.20',
        'ping 10.0.0.5',
        'ping 192.168.1.99',
        'ping nonsense',
        'ipconfig',
        'ifconfig',
        'help',
        'clear',
        'cls',
        'foo',
      ];
      for (const input of inputs) {
        const first = runCommand(n, 'pc1', input, os);
        expect(runCommand(n, 'pc1', input, os)).toEqual(first);
      }
      expect(n).toEqual(before);
    },
  );

  it('reads the network it is given (a changed address shows up)', () => {
    const n = labNet();
    const host = n.devices.find((d) => d.id === 'pc1');
    if (host) host.ip = '192.168.1.11';
    expect(runCommand(n, 'pc1', 'ipconfig', 'windows').lines).toContain(
      '   IPv4 Address. . . . . . . . . . . : 192.168.1.11',
    );
  });
});
