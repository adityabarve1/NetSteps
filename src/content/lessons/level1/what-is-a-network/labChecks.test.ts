// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateLab } from '@/labs/labTasks';
import type { Device, Network } from '@/netcore/network';
import { device, link, net } from '@/netcore/network.fixtures';
import {
  firstNetworkTasks,
  pcsLinkedThroughSwitch,
  pcsShareASubnet,
} from './labChecks';

// The builder names devices "PC1", "Switch1" and so on; the fixtures here do
// the same, because the goals (and `canPing`) find PC1 and PC2 by name.
function pc(n: number, ip?: string, mask = '255.255.255.0'): Device {
  const config = ip === undefined ? {} : { ip, mask };
  return { ...device(`pc${String(n)}`, 'pc', config), name: `PC${String(n)}` };
}
function sw(n: number): Device {
  return {
    ...device(`switch${String(n)}`, 'switch'),
    name: `Switch${String(n)}`,
  };
}

const goals = (n: Network) =>
  evaluateLab(firstNetworkTasks, n).map((r) => r.done);

const good = (): Network =>
  net(
    [pc(1, '192.168.1.10'), sw(1), pc(2, '192.168.1.20')],
    [link('pc1', 'switch1'), link('switch1', 'pc2')],
  );

describe('pcsLinkedThroughSwitch (goal 1)', () => {
  it('is true when PC1 and PC2 are each cabled to the same switch', () => {
    expect(pcsLinkedThroughSwitch(good())).toBe(true);
  });

  it('accepts a chain of switches between them', () => {
    const n = net(
      [pc(1), sw(1), sw(2), pc(2)],
      [
        link('pc1', 'switch1'),
        link('switch1', 'switch2'),
        link('switch2', 'pc2'),
      ],
    );
    expect(pcsLinkedThroughSwitch(n)).toBe(true);
  });

  it('is false for a direct cable between PC1 and PC2', () => {
    expect(
      pcsLinkedThroughSwitch(net([pc(1), pc(2)], [link('pc1', 'pc2')])),
    ).toBe(false);
  });

  it('is false when only PC1 is on the switch', () => {
    const n = net([pc(1), sw(1), pc(2)], [link('pc1', 'switch1')]);
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('is false when the two switches are not joined', () => {
    const n = net(
      [pc(1), sw(1), sw(2), pc(2)],
      [link('pc1', 'switch1'), link('switch2', 'pc2')],
    );
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('does not let a computer stand in for a switch', () => {
    const n = net(
      [pc(1), sw(1), pc(3), pc(2)],
      [link('pc1', 'switch1'), link('switch1', 'pc3'), link('pc3', 'pc2')],
    );
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('does not count a computer between PC1 and the switch', () => {
    const n = net(
      [pc(1), pc(3), sw(1), pc(2)],
      [link('pc1', 'pc3'), link('pc3', 'switch1'), link('switch1', 'pc2')],
    );
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('ignores other computers on a switch when PC1 and PC2 are not on it', () => {
    const n = net(
      [pc(1), pc(2), pc(3), pc(4), sw(1)],
      [link('pc1', 'pc2'), link('pc3', 'switch1'), link('switch1', 'pc4')],
    );
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('matches names ignoring case, and is false without PC1 or PC2', () => {
    const lower = good();
    lower.devices = lower.devices.map((d) => ({
      ...d,
      name: d.name.toLowerCase(),
    }));
    expect(pcsLinkedThroughSwitch(lower)).toBe(true);
    const n = good();
    n.devices = n.devices.filter((d) => d.name !== 'PC2');
    expect(pcsLinkedThroughSwitch(n)).toBe(false);
  });

  it('is false for an empty or malformed network', () => {
    expect(pcsLinkedThroughSwitch(net([], []))).toBe(false);
    expect(
      pcsLinkedThroughSwitch({ devices: null } as unknown as Network),
    ).toBe(false);
  });
});

describe('pcsShareASubnet (goal 2)', () => {
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

  it('only counts PC1 and PC2, not two other computers', () => {
    const n = net(
      [pc(1), pc(2), pc(3, '192.168.1.30'), pc(4, '192.168.1.40')],
      [],
    );
    expect(pcsShareASubnet(n)).toBe(false);
  });

  it('is false for a malformed network', () => {
    expect(pcsShareASubnet({ devices: 5 } as unknown as Network)).toBe(false);
  });
});

describe('firstNetworkTasks', () => {
  it('has the three goals, in order, all done for a good network', () => {
    expect(evaluateLab(firstNetworkTasks, good())).toEqual([
      {
        id: 'pcs-through-a-switch',
        description: 'PC1 and PC2 are connected through a switch',
        done: true,
      },
      {
        id: 'same-subnet',
        description: 'PC1 and PC2 have their own addresses in the same subnet',
        done: true,
      },
      {
        id: 'pcs-can-ping',
        description: 'PC1 and PC2 can ping each other',
        done: true,
      },
    ]);
  });

  it('nothing is done on an empty canvas', () => {
    expect(goals(net([], []))).toEqual([false, false, false]);
  });

  it('the reviewer’s distraction case: PC1-PC2 cabled directly, PC3 and PC4 on the switch', () => {
    const n = net(
      [pc(1), pc(2), pc(3), pc(4), sw(1)],
      [link('pc1', 'pc2'), link('pc3', 'switch1'), link('switch1', 'pc4')],
    );
    expect(goals(n)).toEqual([false, false, false]);
  });

  it('a direct cable with good addresses pings, but goal 1 stays undone', () => {
    const n = net(
      [pc(1, '192.168.1.10'), pc(2, '192.168.1.20')],
      [link('pc1', 'pc2')],
    );
    expect(goals(n)).toEqual([false, true, true]);
  });

  it('two switches in a chain pass every goal', () => {
    const n = net(
      [pc(1, '192.168.1.10'), sw(1), sw(2), pc(2, '192.168.1.20')],
      [
        link('pc1', 'switch1'),
        link('switch1', 'switch2'),
        link('switch2', 'pc2'),
      ],
    );
    expect(goals(n)).toEqual([true, true, true]);
  });

  it('the same address on both computers fails the ping goal (a raw ping would pass)', () => {
    const n = net(
      [pc(1, '192.168.1.10'), sw(1), pc(2, '192.168.1.10')],
      [link('pc1', 'switch1'), link('switch1', 'pc2')],
    );
    expect(goals(n)).toEqual([true, false, false]);
  });

  it('the ping goal needs a real path, not only good addresses', () => {
    const n = good();
    expect(goals({ ...n, links: n.links.slice(0, 1) })).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('the ping goal must work in both directions', () => {
    // PC2's narrow mask puts PC1 outside its subnet: PC1 reaches PC2, not back.
    const n = net(
      [pc(1, '192.168.1.10', '/16'), sw(1), pc(2, '192.168.2.20', '/24')],
      [link('pc1', 'switch1'), link('switch1', 'pc2')],
    );
    expect(goals(n)).toEqual([true, false, false]);
  });
});
