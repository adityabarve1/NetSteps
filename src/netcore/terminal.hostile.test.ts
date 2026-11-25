import { describe, expect, it } from 'vitest';
import { runCommand } from './terminal';
import type { TerminalOs } from './terminal';
import { labNet } from './terminal.fixtures';

// A tiny seeded generator keeps the fuzz run identical every time.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const fragments = [
  'ping',
  'PING',
  'ipconfig',
  'ifconfig',
  'help',
  'clear',
  'cls',
  ' ',
  '  ',
  '\t',
  '\n',
  '\r\n',
  '192.168.1.20',
  '192.168.1.10',
  '10.0.0.5',
  '999.1.1.1',
  '0.0.0.0',
  '255.255.255.255',
  '-n',
  '-c',
  '/?',
  ';',
  '|',
  '&&',
  '$(whoami)',
  '`id`',
  '../../etc/passwd',
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  '<script>alert(1)</script>',
  '"',
  "'",
  '\\',
  '%s%n',
  '\u0000',
  '\u0007',
  '\u001b[2J',
  '\u007f',
  '\u0085',
  '​',
  '‮',
  '﻿',
  '\ud83d',
  '\ude00',
  '\u{1f600}',
  '٣.٢.١.٠',
  'Ｐｉｎｇ',
  'ı',
  'İ',
];

function randomInput(next: () => number): string {
  const kind = next();
  if (kind < 0.1) {
    return 'x'.repeat(Math.floor(next() * 5000));
  }
  if (kind < 0.2) {
    let s = '';
    const length = Math.floor(next() * 40);
    for (let i = 0; i < length; i += 1) {
      s += String.fromCharCode(Math.floor(next() * 0x10000));
    }
    return s;
  }
  const count = 1 + Math.floor(next() * 6);
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    parts.push(fragments[Math.floor(next() * fragments.length)] ?? '');
  }
  return parts.join(next() < 0.5 ? ' ' : '');
}

const named = [
  'ping 1.2.3.4 ; rm -rf /',
  'ping $(whoami)',
  'ping 192.168.1.20|cat',
  'ping `id`',
  'ping 192.168.1.20 && echo pwned',
  '__proto__',
  'constructor',
  'ping __proto__',
  'ping constructor',
  '\u0000'.repeat(300),
  'ping ' + '9'.repeat(100000),
  'a'.repeat(1_000_000),
];

describe.each<TerminalOs>(['windows', 'unix'])('hostile input (%s)', (os) => {
  const net = labNet();

  function expectSafe(host: string, input: string): void {
    let result: ReturnType<typeof runCommand> | undefined;
    expect(() => {
      result = runCommand(net, host, input, os);
    }).not.toThrow();
    expect(Array.isArray(result?.lines)).toBe(true);
    for (const line of result?.lines ?? []) expect(typeof line).toBe('string');
    expect(['boolean', 'undefined']).toContain(typeof result?.clear);
  }

  it('survives the named hostile strings on every kind of host', () => {
    for (const host of ['pc1', 'blank', 'sw1', 'nope', '__proto__']) {
      for (const input of named) expectSafe(host, input);
    }
  });

  it('survives 5000 random hostile strings', () => {
    const next = seeded(20261125);
    const hosts = ['pc1', 'pc2', 'blank', 'badmask', 'sw1', 'nope'];
    for (let i = 0; i < 5000; i += 1) {
      expectSafe(hosts[i % hosts.length] ?? 'pc1', randomInput(next));
    }
  });

  it('never runs anything: a shell command is just extra arguments', () => {
    expect(runCommand(net, 'pc1', 'ping 1.2.3.4 ; rm -rf /', os).lines).toEqual(
      ['Usage: ping <ip-address>'],
    );
    expect(
      runCommand(net, 'pc1', 'ping 192.168.1.20 && echo pwned', os).lines,
    ).toEqual(['Usage: ping <ip-address>']);
  });

  it('does not change the network, whatever is typed', () => {
    const before = structuredClone(net);
    const next = seeded(7);
    for (let i = 0; i < 300; i += 1)
      runCommand(net, 'pc1', randomInput(next), os);
    expect(net).toEqual(before);
  });
});
