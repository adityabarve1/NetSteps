// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateLab } from '@/labs/labTasks';
import type { Device, Network } from '@/netcore/network';
import { device, link, net, sw } from '@/netcore/network.fixtures';
import {
  firstNetworkTasks,
  pcsShareASwitch,
  pcsShareASubnet,
} from './labChecks';

// The builder names devices "PC1", "Switch1" and so on; the fixtures here do
// the same so `canPing` (which matches names) sees what the learner sees.
function pc(n: number, ip?: string, mask?: string): Device {
  const config: { ip?: string; mask?: string } = {};
  if (ip !== undefined) config.ip = ip;
  if (mask !== undefined) config.mask = mask;
  return { ...device(`pc${String(n)}`, 'pc', config), name: `PC${String(n)}` };
}

const good = (): Network =>
  net(
    [
      pc(1, '192.168.1.10', '255.255.255.0'),
      { ...sw('switch1'), name: 'Switch1' },
      pc(2, '192.168.1.20', '255.255.255.0'),
    ],
    [link('pc1', 'switch1'), link('switch1', 'pc2')],
  );

describe('pcsShareASwitch', () => {
  it('is true when two computers are each cabled to the same switch', () => {
    expect(pcsShareASwitch(good())).toBe(true);
  });

  it('is false with only one computer on the switch', () => {
    const n = good();
    expect(pcsShareASwitch({ ...n, links: n.links.slice(0, 1) })).toBe(false);
  });

  it('is false for two computers on two different switches', () => {
    const n = net(
      [pc(1), sw('s1'), sw('s2'), pc(2)],
      [link('pc1', 's1'), link('s2', 'pc2')],
    );
    expect(pcsShareASwitch(n)).toBe(false);
  });

  it('does not count a second switch as a computer', () => {
    const n = net(
      [pc(1), sw('s1'), sw('s2')],
      [link('pc1', 's1'), link('s1', 's2')],
    );
    expect(pcsShareASwitch(n)).toBe(false);
  });

  it('is false for a direct cable between two computers (no switch)', () => {
    expect(pcsShareASwitch(net([pc(1), pc(2)], [link('pc1', 'pc2')]))).toBe(
      false,
    );
  });

  it('counts one computer cabled twice to the switch only once', () => {
    const n = net(
      [pc(1), sw('s1')],
      [link('pc1', 's1', 'a'), link('s1', 'pc1', 'b')],
    );
    expect(pcsShareASwitch(n)).toBe(false);
  });

  it('is false for an empty or malformed network', () => {
    expect(pcsShareASwitch(net([], []))).toBe(false);
    expect(pcsShareASwitch({ devices: null } as unknown as Network)).toBe(
      false,
    );
  });
});

describe('pcsShareASubnet', () => {
  it('is true for two different addresses in one subnet', () => {
    expect(pcsShareASubnet(good())).toBe(true);
  });

  it('accepts the slash form of the mask', () => {
    const n = net(
      [pc(1, '192.168.1.10', '/24'), pc(2, '192.168.1.20', '/24')],
      [],
    );
    expect(pcsShareASubnet(n)).toBe(true);
  });

  it.each([
    ['different subnets', '192.168.1.10', '192.168.2.20', '255.255.255.0'],
    ['the same address twice', '192.168.1.10', '192.168.1.10', '255.255.255.0'],
    ['a blank mask', '192.168.1.10', '192.168.1.20', ''],
    ['a mistyped address', '192.168.1.10', '192.168.1.300', '255.255.255.0'],
    ['a non-contiguous mask', '192.168.1.10', '192.168.1.20', '255.0.255.0'],
  ])('is false for %s', (_name, a, b, mask) => {
    expect(pcsShareASubnet(net([pc(1, a, mask), pc(2, b, mask)], []))).toBe(
      false,
    );
  });

  it('is false when only one mask covers both addresses', () => {
    const n = net(
      [pc(1, '192.168.1.10', '/16'), pc(2, '192.168.2.20', '/24')],
      [],
    );
    expect(pcsShareASubnet(n)).toBe(false);
  });

  it('is false with fewer than two computers or a malformed network', () => {
    expect(pcsShareASubnet(net([pc(1, '192.168.1.10', '/24')], []))).toBe(
      false,
    );
    expect(pcsShareASubnet({ devices: 5 } as unknown as Network)).toBe(false);
  });
});

describe('firstNetworkTasks', () => {
  it('has the three goals, in order, all done for a good network', () => {
    expect(evaluateLab(firstNetworkTasks, good())).toEqual([
      {
        id: 'two-pcs-on-a-switch',
        description: 'Two computers are connected through a switch',
        done: true,
      },
      {
        id: 'same-subnet',
        description:
          'Both computers have their own addresses in the same subnet',
        done: true,
      },
      { id: 'pc1-pings-pc2', description: 'PC1 can ping PC2', done: true },
    ]);
  });

  it('nothing is done on an empty canvas', () => {
    const done = evaluateLab(firstNetworkTasks, net([], [])).map((r) => r.done);
    expect(done).toEqual([false, false, false]);
  });

  it('the ping goal needs a real path, not only good addresses', () => {
    const n = good();
    const unplugged = { ...n, links: n.links.slice(0, 1) };
    expect(
      evaluateLab(firstNetworkTasks, unplugged).map((r) => r.done),
    ).toEqual([false, true, false]);
  });

  it('a direct cable passes the ping goal but not the switch goal', () => {
    const n = net(
      [
        pc(1, '192.168.1.10', '255.255.255.0'),
        pc(2, '192.168.1.20', '255.255.255.0'),
      ],
      [link('pc1', 'pc2')],
    );
    expect(evaluateLab(firstNetworkTasks, n).map((r) => r.done)).toEqual([
      false,
      true,
      true,
    ]);
  });
});
