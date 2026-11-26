// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateLab } from '@/labs/labTasks';
import type { Device, Network } from '@/netcore/network';
import { device, link, net } from '@/netcore/network.fixtures';
import { everyPcCanPingEveryOther, starIsBuilt, starTasks } from './labChecks';

// The builder names devices "PC1", "Switch1" and so on; the fixtures do the
// same, because the goals (and `canPing`) find the lab's devices by name.
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

const goals = (n: Network) => evaluateLab(starTasks, n).map((r) => r.done);

function star(
  ips = ['192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13'],
) {
  return net(
    [sw(1), ...ips.map((ip, i) => pc(i + 1, ip))],
    [1, 2, 3, 4].map((i) => link(`pc${String(i)}`, 'switch1')),
  );
}

describe('starIsBuilt (goal 1)', () => {
  it('is true for four PCs each cabled to Switch1', () => {
    expect(starIsBuilt(star())).toBe(true);
    // Addresses do not matter for this goal.
    expect(starIsBuilt(star(['', '', '', ''].map(() => '')))).toBe(true);
  });

  it('is false for an empty or missing network', () => {
    expect(starIsBuilt(net([], []))).toBe(false);
    expect(starIsBuilt(undefined as unknown as Network)).toBe(false);
  });

  it('is false when a PC is missing from the switch', () => {
    const n = net(
      [sw(1), pc(1), pc(2), pc(3), pc(4)],
      [1, 2, 3].map((i) => link(`pc${String(i)}`, 'switch1')),
    );
    expect(starIsBuilt(n)).toBe(false);
  });

  it('is false when PC4 is cabled to a second switch instead', () => {
    const n = net(
      [sw(1), sw(2), pc(1), pc(2), pc(3), pc(4)],
      [
        link('pc1', 'switch1'),
        link('pc2', 'switch1'),
        link('pc3', 'switch1'),
        link('pc4', 'switch2'),
        link('switch1', 'switch2'),
      ],
    );
    expect(starIsBuilt(n)).toBe(false);
  });

  it('is false for direct cables between computers, with no switch', () => {
    const n = net(
      [pc(1), pc(2), pc(3), pc(4)],
      [link('pc1', 'pc2'), link('pc3', 'pc4')],
    );
    expect(starIsBuilt(n)).toBe(false);
  });

  it('is false when a computer also has a cable to another computer', () => {
    const n = star();
    n.links.push(link('pc1', 'pc2'));
    expect(starIsBuilt(n)).toBe(false);
  });

  it('is false when the hub is a computer called Switch1', () => {
    const n = net(
      [{ ...pc(5), name: 'Switch1' }, pc(1), pc(2), pc(3), pc(4)],
      [1, 2, 3, 4].map((i) => link(`pc${String(i)}`, 'pc5')),
    );
    expect(starIsBuilt(n)).toBe(false);
  });

  it('is false when a PC is really a server', () => {
    const n = star();
    n.devices = n.devices.map((d) =>
      d.id === 'pc2' ? { ...d, kind: 'server' } : d,
    );
    expect(starIsBuilt(n)).toBe(false);
  });

  it('matches names ignoring case', () => {
    const n = star();
    n.devices = n.devices.map((d) => ({ ...d, name: d.name.toLowerCase() }));
    expect(starIsBuilt(n)).toBe(true);
  });

  it('does not tick for a distraction: another star under other names', () => {
    const other = net(
      [sw(2), pc(5), pc(6), pc(7), pc(8)],
      [5, 6, 7, 8].map((i) => link(`pc${String(i)}`, 'switch2')),
    );
    expect(starIsBuilt(other)).toBe(false);
  });

  it('still ticks when extra devices sit on the canvas', () => {
    const n = star();
    n.devices.push(sw(2), pc(9));
    n.links.push(link('pc9', 'switch2'));
    expect(starIsBuilt(n)).toBe(true);
  });
});

describe('everyPcCanPingEveryOther (goal 2)', () => {
  it('is true for the finished star', () => {
    expect(everyPcCanPingEveryOther(star())).toBe(true);
  });

  it('is false when PC4 has no address', () => {
    expect(
      everyPcCanPingEveryOther(
        net(
          [
            sw(1),
            pc(1, '192.168.1.10'),
            pc(2, '192.168.1.11'),
            pc(3, '192.168.1.12'),
            pc(4),
          ],
          [1, 2, 3, 4].map((i) => link(`pc${String(i)}`, 'switch1')),
        ),
      ),
    ).toBe(false);
  });

  it('is false when one PC is in another subnet', () => {
    expect(
      everyPcCanPingEveryOther(
        star(['192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.2.13']),
      ),
    ).toBe(false);
  });

  it('is false when one cable is missing', () => {
    const n = star();
    n.links.pop();
    expect(everyPcCanPingEveryOther(n)).toBe(false);
  });

  it('is false when two computers share one address (duplicate-IP trap)', () => {
    // A raw `ping` from PC1 to the shared address would reach PC1 itself.
    expect(
      everyPcCanPingEveryOther(
        star(['192.168.1.10', '192.168.1.10', '192.168.1.12', '192.168.1.13']),
      ),
    ).toBe(false);
    expect(
      everyPcCanPingEveryOther(
        star(['192.168.1.10', '192.168.1.10', '192.168.1.10', '192.168.1.10']),
      ),
    ).toBe(false);
  });

  it('does not count a ping to a computer’s own address (direct-cable trap)', () => {
    // Direct cables between the PCs, no switch: pings can succeed, but the
    // star goal stays undone, so the lab is not finished.
    const n = net(
      [
        pc(1, '192.168.1.10'),
        pc(2, '192.168.1.11'),
        pc(3, '192.168.1.12'),
        pc(4, '192.168.1.13'),
      ],
      [link('pc1', 'pc2'), link('pc3', 'pc4')],
    );
    expect(everyPcCanPingEveryOther(n)).toBe(false);
    expect(goals(n)).toEqual([false, false]);
  });

  it('is false with no devices and for a missing network', () => {
    expect(everyPcCanPingEveryOther(net([], []))).toBe(false);
    expect(everyPcCanPingEveryOther(undefined as unknown as Network)).toBe(
      false,
    );
  });

  it('is false when the right addresses sit on devices with other names', () => {
    const n = net(
      [
        sw(1),
        pc(5, '192.168.1.10'),
        pc(6, '192.168.1.11'),
        pc(7, '192.168.1.12'),
        pc(8, '192.168.1.13'),
      ],
      [5, 6, 7, 8].map((i) => link(`pc${String(i)}`, 'switch1')),
    );
    expect(goals(n)).toEqual([false, false]);
  });
});

describe('starTasks', () => {
  it('lists the two goals in order', () => {
    expect(starTasks.map((t) => t.id)).toEqual([
      'star-built',
      'every-pc-can-ping',
    ]);
  });

  it('ticks both for the finished star and only the first when addresses are missing', () => {
    expect(goals(star())).toEqual([true, true]);
    expect(goals(star(['', '', '', '']))).toEqual([true, false]);
  });

  it('un-ticks both goals after one cable is removed', () => {
    const n = star();
    n.links = n.links.filter((l) => l.a !== 'pc3');
    expect(goals(n)).toEqual([false, false]);
  });
});
