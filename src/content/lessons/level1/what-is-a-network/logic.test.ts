// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Network } from '@/netcore/network';
import {
  device,
  link,
  net,
  pc,
  simpleLan,
  sw,
} from '@/netcore/network.fixtures';
import { journeySteps } from './logic';

const captions = (n: Network, from: string, to: string) =>
  journeySteps(n, from, to).map((s) => s.caption);

describe('journeySteps: a message that arrives', () => {
  it('PC1 -> SW1 -> PC2 gives a start step, one step per hop and an end step', () => {
    const steps = journeySteps(simpleLan(), 'pc1', 'pc2');

    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.at)).toEqual([
      ['pc1'],
      ['pc1', 'sw1'],
      ['sw1', 'pc2'],
      ['pc2'],
    ]);
    expect(steps[0]?.caption).toBe(
      'PC1 has a message for PC2, whose address is 192.168.1.20. PC1 sends it out over its link.',
    );
    expect(steps[1]?.caption).toBe(
      'The message travels along the link from PC1 to SW1. SW1 is a switch: it passes the message on toward PC2.',
    );
    expect(steps[2]?.caption).toBe(
      'The message travels along the last link, from SW1 to PC2.',
    );
    expect(steps[3]?.caption).toBe(
      'PC2 receives the message. It crossed 2 links and passed through 1 switch on the way.',
    );
  });

  it('names every device on the path in the captions', () => {
    const text = captions(simpleLan(), 'pc1', 'pc2').join(' ');
    for (const name of ['PC1', 'SW1', 'PC2']) expect(text).toContain(name);
  });

  it('a direct link between two computers gives three steps and no switch', () => {
    const lan = net(
      [pc('pc1', '192.168.1.10'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'pc2')],
    );
    const steps = journeySteps(lan, 'pc1', 'pc2');

    expect(steps.map((s) => s.at)).toEqual([['pc1'], ['pc1', 'pc2'], ['pc2']]);
    expect(steps[1]?.caption).toBe(
      'The message travels along the last link, from PC1 to PC2.',
    );
    expect(steps[2]?.caption).toBe(
      'PC2 receives the message. It crossed 1 link and passed through no switch on the way.',
    );
  });

  it('a longer path through two switches has one step per hop', () => {
    const lan = net(
      [
        pc('pc1', '192.168.1.10'),
        sw('sw1'),
        sw('sw2'),
        pc('pc2', '192.168.1.20'),
      ],
      [link('pc1', 'sw1'), link('sw1', 'sw2'), link('sw2', 'pc2')],
    );
    const steps = journeySteps(lan, 'pc1', 'pc2');

    expect(steps.map((s) => s.at)).toEqual([
      ['pc1'],
      ['pc1', 'sw1'],
      ['sw1', 'sw2'],
      ['sw2', 'pc2'],
      ['pc2'],
    ]);
    expect(steps[2]?.caption).toBe(
      'The message travels along the link from SW1 to SW2. SW2 is a switch: it passes the message on toward PC2.',
    );
    expect(steps[4]?.caption).toBe(
      'PC2 receives the message. It crossed 3 links and passed through 2 switches on the way.',
    );
  });

  it('works in the other direction too', () => {
    const steps = journeySteps(simpleLan(), 'pc2', 'pc1');
    expect(steps.map((s) => s.at)).toEqual([
      ['pc2'],
      ['pc2', 'sw1'],
      ['sw1', 'pc1'],
      ['pc1'],
    ]);
  });

  it('a device sending to itself is one step and crosses no link', () => {
    const steps = journeySteps(simpleLan(), 'pc1', 'pc1');
    expect(steps).toEqual([
      {
        caption:
          'PC1 is sending a message to itself. The message never leaves PC1, so it crosses no link.',
        at: ['pc1'],
      },
    ]);
  });

  it('uses the id when a device has a blank name', () => {
    const lan = simpleLan();
    const named = {
      ...lan,
      devices: lan.devices.map((d) =>
        d.id === 'sw1' ? { ...d, name: '   ' } : d,
      ),
    };
    expect(captions(named, 'pc1', 'pc2')[1]).toContain('from PC1 to sw1');
  });
});

describe('journeySteps: a message that cannot arrive is one plain step', () => {
  it('no chain of links (no-path)', () => {
    const lan = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'sw1')],
    );
    expect(journeySteps(lan, 'pc1', 'pc2')).toEqual([
      {
        caption:
          'PC1 cannot reach PC2: no chain of links and switches joins them, so the message has no way to get there.',
        at: ['pc1'],
      },
    ]);
  });

  it('a computer is not a stepping stone: PC2 does not pass messages on', () => {
    const lan = net(
      [
        pc('pc1', '192.168.1.10'),
        pc('pc2', '192.168.1.20'),
        pc('pc3', '192.168.1.30'),
      ],
      [link('pc1', 'pc2'), link('pc2', 'pc3')],
    );
    const steps = journeySteps(lan, 'pc1', 'pc3');
    expect(steps).toHaveLength(1);
    expect(steps[0]?.caption).toContain('no chain of links and switches');
  });

  it('the sender has no address (no-ip-config)', () => {
    const lan = net(
      [pc('pc1'), sw('sw1'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(journeySteps(lan, 'pc1', 'pc2')).toEqual([
      {
        caption:
          'PC1 cannot send yet: it has no address of its own. Give it an IP address and a subnet mask first.',
        at: ['pc1'],
      },
    ]);
  });

  it('the receiver has no address (unknown-host)', () => {
    const lan = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(journeySteps(lan, 'pc1', 'pc2')).toEqual([
      {
        caption:
          'PC1 cannot reach PC2: PC2 has no address yet, so there is nothing to send the message to.',
        at: ['pc1'],
      },
    ]);
  });

  it('a receiver with a mistyped address has no VALID address', () => {
    const lan = net(
      [
        pc('pc1', '192.168.1.10'),
        sw('sw1'),
        device('pc2', 'pc', { ip: '192.168.1.300', mask: '/24' }),
      ],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(captions(lan, 'pc1', 'pc2')).toEqual([
      'PC1 cannot reach PC2: PC2 has no valid address (192.168.1.300 is not an IP address), so there is nothing to send the message to.',
    ]);
  });

  it('the two are in different networks (different-network)', () => {
    const lan = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.2.20')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(journeySteps(lan, 'pc1', 'pc2')).toEqual([
      {
        caption:
          'PC1 cannot reach PC2: their addresses put them in different networks. Joining two networks needs a router, which a later lesson covers.',
        at: ['pc1'],
      },
    ]);
  });

  it('the receiver shares its address with a nearer device', () => {
    const lan = net(
      [
        pc('pc1', '192.168.1.10'),
        sw('sw1'),
        pc('pc2', '192.168.1.20'),
        pc('pc3', '192.168.1.20'),
      ],
      [link('pc1', 'pc3'), link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(journeySteps(lan, 'pc1', 'pc2')).toEqual([
      {
        caption:
          'PC2 and PC3 have the same address, 192.168.1.20, so messages cannot tell them apart. Every device needs its own address.',
        at: ['pc1'],
      },
    ]);
  });

  it('the receiver shares the sender’s own address', () => {
    const lan = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.1.10')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(captions(lan, 'pc1', 'pc2')).toEqual([
      'PC1 and PC2 have the same address, 192.168.1.10, so messages cannot tell them apart. Every device needs its own address.',
    ]);
  });
});

describe('journeySteps: odd and hostile input never throws', () => {
  const missing =
    'There is no such device in this network, so no message can be sent.';

  it.each([
    ['an unknown sender', 'nope', 'pc2', []],
    ['an unknown receiver', 'pc1', 'nope', ['pc1']],
    ['two unknown ids', 'a', 'b', []],
    ['empty ids', '', '', []],
    ['a prototype key', '__proto__', 'constructor', []],
    ['a very long id', 'x'.repeat(10_000), 'pc2', []],
  ])('%s gives one friendly step', (_name, from, to, at) => {
    expect(journeySteps(simpleLan(), from, to)).toEqual([
      { caption: missing, at },
    ]);
  });

  it('a non-string id or a malformed network is treated as missing', () => {
    const broken = { devices: null, links: 7 } as unknown as Network;
    expect(journeySteps(broken, 'pc1', 'pc2')).toEqual([
      { caption: missing, at: [] },
    ]);
    expect(journeySteps(simpleLan(), 42 as unknown as string, 'pc2')).toEqual([
      { caption: missing, at: [] },
    ]);
    expect(journeySteps(undefined as unknown as Network, 'pc1', 'pc2')).toEqual(
      [{ caption: missing, at: [] }],
    );
  });

  it('an empty network gives one friendly step', () => {
    expect(journeySteps(net([], []), 'pc1', 'pc2')).toEqual([
      { caption: missing, at: [] },
    ]);
  });

  it('is deterministic and does not change the network', () => {
    const lan = simpleLan();
    const before = structuredClone(lan);
    const first = journeySteps(lan, 'pc1', 'pc2');
    const second = journeySteps(lan, 'pc1', 'pc2');
    expect(second).toEqual(first);
    expect(lan).toEqual(before);
    expect(first[0]?.at).not.toBe(second[0]?.at);
  });
});
