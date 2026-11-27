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

describe('journeySteps: switches and invalid settings get their own words', () => {
  it('a switch cannot be the sender', () => {
    expect(journeySteps(simpleLan(), 'sw1', 'pc2')).toEqual([
      {
        caption:
          'SW1 is a switch: it has no address of its own here and only passes other devices’ messages along. Pick a computer to send from.',
        at: ['sw1'],
      },
    ]);
  });

  it('a switch cannot be the receiver', () => {
    expect(journeySteps(simpleLan(), 'pc1', 'sw1')).toEqual([
      {
        caption:
          'PC1 cannot send a message to SW1: a switch has no address of its own here. It only passes other devices’ messages along.',
        at: ['pc1'],
      },
    ]);
  });

  it('no switch caption ever asks for an address to be typed in', () => {
    const lan = simpleLan();
    for (const [from, to] of [
      ['sw1', 'pc2'],
      ['pc1', 'sw1'],
      ['sw1', 'sw1'],
    ] as const) {
      for (const step of journeySteps(lan, from, to)) {
        expect(step.caption).not.toMatch(/Give it an IP address/);
      }
    }
  });

  it('a sender with an invalid address or mask is told to check both', () => {
    const lan = net(
      [
        device('pc1', 'pc', { ip: '192.168.1.10', mask: '255.0.255.0' }),
        sw('sw1'),
        pc('pc2', '192.168.1.20'),
      ],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(captions(lan, 'pc1', 'pc2')).toEqual([
      'PC1 cannot send yet: its IP address or subnet mask is not valid. Check both.',
    ]);
  });
});
