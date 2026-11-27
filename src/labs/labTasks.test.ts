import { describe, expect, it } from 'vitest';
import { builderReducer, type BuilderAction } from '@/labs/builderReducer';
import {
  canPing,
  evaluateLab,
  twoPcsCanPingTask,
  type LabTask,
} from '@/labs/labTasks';
import type { Network } from '@/netcore/network';

function run(start: Network, ...actions: BuilderAction[]): Network {
  return actions.reduce(builderReducer, start);
}

const cfg = (id: string, ip: string, mask = '/24'): BuilderAction => ({
  type: 'setConfig',
  id,
  ip,
  mask,
});

const add = (kind: 'pc' | 'switch' | 'server'): BuilderAction => ({
  type: 'addDevice',
  kind,
  x: 100,
  y: 100,
});

const devicesOnly = (): Network =>
  run({ devices: [], links: [] }, add('pc'), add('pc'), add('switch'));

const wired = (): Network =>
  run(
    devicesOnly(),
    { type: 'connect', a: 'pc1', b: 'switch1' },
    { type: 'connect', a: 'pc2', b: 'switch1' },
  );

describe('evaluateLab', () => {
  it('reports each task with its description and done state', () => {
    const tasks: LabTask[] = [
      { id: 'a', description: 'First', check: () => true },
      { id: 'b', description: 'Second', check: (n) => n.devices.length > 0 },
    ];
    expect(evaluateLab(tasks, { devices: [], links: [] })).toEqual([
      { id: 'a', description: 'First', done: true },
      { id: 'b', description: 'Second', done: false },
    ]);
  });

  it('returns an empty list for no tasks', () => {
    expect(evaluateLab([], { devices: [], links: [] })).toEqual([]);
  });

  it('reports a task whose check throws as not done, and keeps going', () => {
    const tasks: LabTask[] = [
      {
        id: 'bad',
        description: 'Throws',
        check: () => {
          throw new Error('boom');
        },
      },
      { id: 'ok', description: 'Fine', check: () => true },
    ];
    const result = evaluateLab(tasks, { devices: [], links: [] });
    expect(result.map((r) => r.done)).toEqual([false, true]);
  });

  it('treats a check that returns something odd as not done', () => {
    const tasks = [
      { id: 'odd', description: 'Odd', check: () => 'yes' },
    ] as unknown as LabTask[];
    expect(evaluateLab(tasks, { devices: [], links: [] })[0]?.done).toBe(false);
  });
});

describe('canPing', () => {
  it('resolves device names (any case) and pings the target address', () => {
    const net = run(
      wired(),
      cfg('pc1', '192.168.1.10'),
      cfg('pc2', '192.168.1.20'),
    );
    expect(canPing(net, 'PC1', 'PC2')).toBe(true);
    expect(canPing(net, 'pc2', 'pc1')).toBe(true);
  });

  it('is false for unknown names, a target with no address, or no path', () => {
    const net = run(wired(), cfg('pc1', '192.168.1.10'));
    expect(canPing(net, 'PC1', 'Nobody')).toBe(false);
    expect(canPing(net, 'Nobody', 'PC1')).toBe(false);
    expect(canPing(net, 'PC1', 'PC2')).toBe(false);
    expect(canPing({ devices: [], links: [] }, 'PC1', 'PC2')).toBe(false);
  });
});

describe('twoPcsCanPingTask', () => {
  const task = twoPcsCanPingTask();

  it('has a default id and description that can be overridden', () => {
    expect(task.id).not.toBe('');
    expect(task.description).not.toBe('');
    const custom = twoPcsCanPingTask({ id: 'x', description: 'Custom' });
    expect([custom.id, custom.description]).toEqual(['x', 'Custom']);
  });

  it('is false until addresses, a switch and cables are all in place', () => {
    expect(task.check({ devices: [], links: [] })).toBe(false);
    expect(task.check(devicesOnly())).toBe(false);
    expect(task.check(wired())).toBe(false);
    const oneIp = run(wired(), cfg('pc1', '192.168.1.10'));
    expect(task.check(oneIp)).toBe(false);
    const otherSubnet = run(oneIp, cfg('pc2', '192.168.2.20'));
    expect(task.check(otherSubnet)).toBe(false);
    const noCables = run(
      devicesOnly(),
      cfg('pc1', '192.168.1.10'),
      cfg('pc2', '192.168.1.20'),
    );
    expect(task.check(noCables)).toBe(false);
    const done = run(oneIp, cfg('pc2', '192.168.1.20'));
    expect(task.check(done)).toBe(true);
  });

  it('turns false again when the network is broken afterwards', () => {
    const done = run(
      wired(),
      cfg('pc1', '192.168.1.10'),
      cfg('pc2', '192.168.1.20'),
    );
    expect(task.check(done)).toBe(true);
    expect(task.check(run(done, { type: 'removeDevice', id: 'switch1' }))).toBe(
      false,
    );
  });

  it('works with a direct cable and ignores servers and switches', () => {
    const direct = run(
      devicesOnly(),
      { type: 'connect', a: 'pc1', b: 'pc2' },
      cfg('pc1', '10.0.0.1', '255.255.255.0'),
      cfg('pc2', '10.0.0.2', '255.255.255.0'),
    );
    expect(task.check(direct)).toBe(true);
    const serverOnly = run(
      { devices: [], links: [] },
      add('pc'),
      add('server'),
      add('switch'),
      { type: 'connect', a: 'pc1', b: 'switch1' },
      { type: 'connect', a: 'server1', b: 'switch1' },
      cfg('pc1', '10.0.0.1'),
      cfg('server1', '10.0.0.2'),
    );
    expect(task.check(serverOnly)).toBe(false);
  });
});

describe('twoPcsCanPingTask needs a real path between different devices', () => {
  const task = twoPcsCanPingTask();
  const link = (a: string, b: string): BuilderAction => ({
    type: 'connect',
    a,
    b,
  });

  it('is false for two PCs with the same IP and no cables', () => {
    const net = run(
      devicesOnly(),
      cfg('pc1', '10.0.0.1'),
      cfg('pc2', '10.0.0.1'),
    );
    expect(task.check(net)).toBe(false);
    expect(canPing(net, 'PC1', 'PC2')).toBe(false);
  });

  it('is false for two PCs with the same IP behind a switch (a duplicate address is the mistake, not a success)', () => {
    const net = run(wired(), cfg('pc1', '10.0.0.1'), cfg('pc2', '10.0.0.1'));
    expect(task.check(net)).toBe(false);
  });

  it('does not count a PC pinging its own address', () => {
    const net = run(wired(), cfg('pc1', '10.0.0.1'));
    expect(canPing(net, 'PC1', 'PC1')).toBe(false);
  });

  it('is false when only one direction works (different masks)', () => {
    const net = run(
      wired(),
      cfg('pc1', '10.0.0.1', '255.0.0.0'),
      cfg('pc2', '10.1.0.1', '255.255.0.0'),
    );
    expect(canPing(net, 'PC1', 'PC2')).toBe(true);
    expect(canPing(net, 'PC2', 'PC1')).toBe(false);
    expect(task.check(net)).toBe(false);
  });

  it('is true for two PCs through a switch on one subnet', () => {
    const net = run(wired(), cfg('pc1', '10.0.0.1'), cfg('pc2', '10.0.0.2'));
    expect(task.check(net)).toBe(true);
  });

  it('is true for two PCs on a direct cable, because ping allows it', () => {
    const net = run(
      devicesOnly(),
      link('pc1', 'pc2'),
      cfg('pc1', '10.0.0.1'),
      cfg('pc2', '10.0.0.2'),
    );
    expect(task.check(net)).toBe(true);
  });
});
