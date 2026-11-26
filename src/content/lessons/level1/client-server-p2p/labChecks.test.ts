// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateLab } from '@/labs/labTasks';
import type { Device, Network } from '@/netcore/network';
import { device, link, net } from '@/netcore/network.fixtures';
import {
  allOnOneSwitch,
  everyComputerReachesServer,
  serverLabTasks,
} from './labChecks';

// The builder names devices "PC1", "Server1", "Switch1" and so on; the fixtures
// here do the same, because the goals (and `canPing`) find them by name.
function pc(n: number, ip?: string, mask = '255.255.255.0'): Device {
  const config = ip === undefined ? {} : { ip, mask };
  return { ...device(`pc${String(n)}`, 'pc', config), name: `PC${String(n)}` };
}
function server(n: number, ip?: string, mask = '255.255.255.0'): Device {
  const config = ip === undefined ? {} : { ip, mask };
  return {
    ...device(`server${String(n)}`, 'server', config),
    name: `Server${String(n)}`,
  };
}
function sw(n: number): Device {
  return {
    ...device(`switch${String(n)}`, 'switch'),
    name: `Switch${String(n)}`,
  };
}

const goals = (n: Network) => evaluateLab(serverLabTasks, n).map((r) => r.done);

const THREE = [
  pc(1, '192.168.1.10'),
  pc(2, '192.168.1.11'),
  pc(3, '192.168.1.12'),
];

const good = (): Network =>
  net(
    [...THREE, server(1, '192.168.1.100'), sw(1)],
    [
      link('pc1', 'switch1'),
      link('pc2', 'switch1'),
      link('pc3', 'switch1'),
      link('server1', 'switch1'),
    ],
  );

describe('allOnOneSwitch (goal 1)', () => {
  it('is true when the three computers and the server are cabled to one switch', () => {
    expect(allOnOneSwitch(good())).toBe(true);
  });

  it('ignores extra devices on the same switch', () => {
    const n = good();
    n.devices.push(pc(4));
    n.links.push(link('pc4', 'switch1'));
    expect(allOnOneSwitch(n)).toBe(true);
  });

  it.each(['pc1', 'pc2', 'pc3', 'server1'])(
    'is false when %s has no cable',
    (id) => {
      const n = good();
      n.links = n.links.filter((l) => l.a !== id && l.b !== id);
      expect(allOnOneSwitch(n)).toBe(false);
    },
  );

  it('is false when they are spread over two switches joined together', () => {
    const n = net(
      [...THREE, server(1), sw(1), sw(2)],
      [
        link('pc1', 'switch1'),
        link('pc2', 'switch1'),
        link('pc3', 'switch2'),
        link('server1', 'switch2'),
        link('switch1', 'switch2'),
      ],
    );
    expect(allOnOneSwitch(n)).toBe(false);
  });

  it('accepts cables drawn in either direction', () => {
    const n = good();
    n.links = n.links.map((l) => ({ ...l, a: l.b, b: l.a }));
    expect(allOnOneSwitch(n)).toBe(true);
  });

  it('needs a switch in the middle, not another computer linked to all four', () => {
    const n = net(
      [...THREE, server(1), pc(4)],
      [
        link('pc1', 'pc4'),
        link('pc2', 'pc4'),
        link('pc3', 'pc4'),
        link('server1', 'pc4'),
      ],
    );
    expect(allOnOneSwitch(n)).toBe(false);
  });

  it('is false for a direct cable from a computer to the server', () => {
    const n = net(
      [...THREE, server(1), sw(1)],
      [link('pc1', 'server1'), link('pc2', 'switch1'), link('pc3', 'switch1')],
    );
    expect(allOnOneSwitch(n)).toBe(false);
  });

  it('is false when the other devices are on the switch but PC1 to PC3 are not', () => {
    const n = net(
      [...THREE, pc(4), pc(5), pc(6), server(1), server(2), sw(1)],
      [
        link('pc4', 'switch1'),
        link('pc5', 'switch1'),
        link('pc6', 'switch1'),
        link('server2', 'switch1'),
      ],
    );
    expect(allOnOneSwitch(n)).toBe(false);
  });

  it('matches names ignoring case, and is false when a name is missing', () => {
    const lower = good();
    lower.devices = lower.devices.map((d) => ({
      ...d,
      name: d.name.toLowerCase(),
    }));
    expect(allOnOneSwitch(lower)).toBe(true);
    const n = good();
    n.devices = n.devices.filter((d) => d.name !== 'Server1');
    expect(allOnOneSwitch(n)).toBe(false);
  });

  it('is false for an empty or malformed network', () => {
    expect(allOnOneSwitch(net([], []))).toBe(false);
    expect(allOnOneSwitch({ devices: null } as unknown as Network)).toBe(false);
    expect(
      allOnOneSwitch({ devices: [], links: 3 } as unknown as Network),
    ).toBe(false);
  });
});

describe('everyComputerReachesServer (goal 2)', () => {
  it('is true for the good network', () => {
    expect(everyComputerReachesServer(good())).toBe(true);
  });

  it('is false when one computer has a different subnet', () => {
    const n = good();
    n.devices = n.devices.map((d) =>
      d.id === 'pc3' ? { ...d, ip: '192.168.2.12' } : d,
    );
    expect(everyComputerReachesServer(n)).toBe(false);
  });

  it.each(['pc1', 'pc2', 'pc3', 'server1'])(
    'is false when %s has no address',
    (id) => {
      const n = good();
      n.devices = n.devices.map((d) =>
        d.id === id ? { ...d, ip: undefined, mask: undefined } : d,
      );
      expect(everyComputerReachesServer(n)).toBe(false);
    },
  );

  it('is false when a cable is missing', () => {
    const n = good();
    n.links = n.links.filter((l) => l.a !== 'pc2' && l.b !== 'pc2');
    expect(everyComputerReachesServer(n)).toBe(false);
  });

  it('single point of failure: unplugging the server fails every computer', () => {
    const n = good();
    n.links = n.links.filter((l) => l.a !== 'server1' && l.b !== 'server1');
    expect(everyComputerReachesServer(n)).toBe(false);
    expect(goals(n)).toEqual([false, false]);
  });

  it('duplicate address trap: PC1 with the same address as Server1 fails (a raw ping would pass)', () => {
    const n = good();
    n.devices = n.devices.map((d) =>
      d.id === 'pc1' ? { ...d, ip: '192.168.1.100' } : d,
    );
    expect(goals(n)).toEqual([true, false]);
  });

  it('two computers with the same address fail the goal', () => {
    const n = good();
    n.devices = n.devices.map((d) =>
      d.id === 'pc3' ? { ...d, ip: '192.168.1.11' } : d,
    );
    expect(goals(n)).toEqual([true, false]);
  });

  it('direct cable trap: PC1 cabled straight to the server pings, but the rest do not', () => {
    const n = net(
      [...THREE, server(1, '192.168.1.100'), sw(1)],
      [link('pc1', 'server1'), link('pc2', 'switch1'), link('pc3', 'switch1')],
    );
    expect(goals(n)).toEqual([false, false]);
  });

  it('two switches in a chain still ping, but goal 1 stays undone', () => {
    const n = net(
      [...THREE, server(1, '192.168.1.100'), sw(1), sw(2)],
      [
        link('pc1', 'switch1'),
        link('pc2', 'switch1'),
        link('pc3', 'switch2'),
        link('server1', 'switch2'),
        link('switch1', 'switch2'),
      ],
    );
    expect(goals(n)).toEqual([false, true]);
  });

  it('is false for a malformed network', () => {
    expect(
      everyComputerReachesServer({ devices: 5 } as unknown as Network),
    ).toBe(false);
  });
});

describe('serverLabTasks', () => {
  it('has the two goals, in order, both done for the good network', () => {
    expect(evaluateLab(serverLabTasks, good())).toEqual([
      {
        id: 'all-on-one-switch',
        description:
          'PC1, PC2, PC3 and Server1 are all connected to the same switch',
        done: true,
      },
      {
        id: 'every-pc-pings-server',
        description:
          'PC1, PC2, PC3 and Server1 have their own addresses, and each computer can ping Server1',
        done: true,
      },
    ]);
  });

  it('nothing is done on an empty canvas', () => {
    expect(goals(net([], []))).toEqual([false, false]);
  });

  it('cabled but without addresses: goal 1 only', () => {
    const n = net([pc(1), pc(2), pc(3), server(1), sw(1)], good().links);
    expect(goals(n)).toEqual([true, false]);
  });
});
