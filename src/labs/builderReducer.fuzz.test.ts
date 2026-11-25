import { describe, expect, it } from 'vitest';
import {
  CANVAS,
  MAX_DEVICES,
  MAX_SWITCH_LINKS,
  builderReducer,
  type BuilderAction,
} from '@/labs/builderReducer';
import { empty } from '@/labs/builderTestKit';
import type { DeviceKind, Network } from '@/netcore/network';

describe('fuzz: 5000 random action sequences', () => {
  // A small seeded generator so a failure can be replayed.
  function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function deepFreeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
      Object.freeze(value);
      for (const v of Object.values(value)) deepFreeze(v);
    }
    return value;
  }

  const kinds: string[] = ['pc', 'server', 'switch', 'router', ''];
  const weird = [NaN, Infinity, -Infinity, -1e9, 1e9, 0, 50, 250, 480, 3.7];
  const strings = [
    '',
    ' ',
    '999.1.1.1',
    '192.168.1.10',
    '/24',
    'x'.repeat(200),
  ];

  function randomAction(r: () => number, net: Network): BuilderAction {
    const pick = <T>(list: readonly T[]): T =>
      list[Math.floor(r() * list.length)] as T;
    const ids = [
      ...net.devices.map((d) => d.id),
      'ghost',
      'pc1',
      'switch1',
      'pc2',
    ];
    const id = () => pick(ids);
    switch (Math.floor(r() * 7)) {
      case 0:
      case 1:
        return {
          type: 'addDevice',
          kind: pick(kinds) as DeviceKind,
          x: pick(weird),
          y: pick(weird),
        };
      case 2:
      case 3:
        return { type: 'connect', a: id(), b: id() };
      case 4:
        return r() < 0.5
          ? { type: 'removeDevice', id: id() }
          : {
              type: 'disconnect',
              linkId: pick([...net.links.map((l) => l.id), 'zz', 'link1']),
            };
      case 5:
        return {
          type: 'setConfig',
          id: id(),
          ip: pick(strings),
          mask: pick(strings),
          ...(r() < 0.5 ? { gateway: pick(strings) } : {}),
        };
      default:
        return { type: 'moveDevice', id: id(), x: pick(weird), y: pick(weird) };
    }
  }

  // Plain checks (not `expect`) so 5000 runs stay fast; the first problem found
  // is reported with its seed so a failure can be replayed.
  function problem(net: Network): string | undefined {
    const ids = new Set(net.devices.map((d) => d.id));
    if (ids.size !== net.devices.length) return 'duplicate device id';
    const names = new Set(net.devices.map((d) => d.name.toLowerCase()));
    if (names.size !== net.devices.length) return 'duplicate device name';
    if (net.devices.length > MAX_DEVICES) return 'too many devices';
    if (new Set(net.links.map((l) => l.id)).size !== net.links.length) {
      return 'duplicate link id';
    }
    const pairs = new Set<string>();
    for (const l of net.links) {
      if (!ids.has(l.a) || !ids.has(l.b)) return 'link to a missing device';
      if (l.a === l.b) return 'self link';
      const key = [l.a, l.b].sort().join('|');
      if (pairs.has(key)) return 'duplicate cable';
      pairs.add(key);
    }
    for (const d of net.devices) {
      const count = net.links.filter(
        (l) => l.a === d.id || l.b === d.id,
      ).length;
      if (count > (d.kind === 'switch' ? MAX_SWITCH_LINKS : 1)) {
        return 'too many cables on ' + d.id;
      }
      const inside =
        d.x >= CANVAS.minX &&
        d.x <= CANVAS.maxX &&
        d.y >= CANVAS.minY &&
        d.y <= CANVAS.maxY;
      if (!inside) return 'position outside the canvas';
    }
    return undefined;
  }

  it('never throws, never mutates, and keeps every invariant', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 5000; seed += 1) {
      const r = rng(seed);
      let net: Network = deepFreeze(empty());
      const steps = 5 + Math.floor(r() * 40);
      for (let i = 0; i < steps; i += 1) {
        const action = randomAction(r, net);
        const before = JSON.stringify(net);
        // The input is frozen, so a mutation would already have thrown.
        const next = builderReducer(net, action);
        const after = JSON.stringify(next);
        if (after === before && next !== net) {
          failures.push(`seed ${String(seed)}: a no-op returned a new object`);
        }
        const found = problem(next);
        if (found !== undefined) {
          failures.push(`seed ${String(seed)} step ${String(i)}: ${found}`);
        }
        net = deepFreeze(next);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  }, 60_000);

  it('never throws on a hostile initial network either', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const r = rng(seed * 7919);
      const pick = (n: number) => Math.floor(r() * n);
      const kindList: DeviceKind[] = ['pc', 'server', 'switch'];
      let net: Network = deepFreeze({
        devices: Array.from({ length: pick(15) }, () => ({
          id: `pc${String(pick(4))}`,
          kind: kindList[pick(3)] ?? 'pc',
          name: `PC${String(pick(3))}`,
          x: pick(2) ? NaN : pick(1000),
          y: pick(1000),
        })),
        links: Array.from({ length: pick(20) }, () => ({
          id: `link${String(pick(3))}`,
          a: `pc${String(pick(5))}`,
          b: `pc${String(pick(5))}`,
        })),
      });
      for (let i = 0; i < 20; i += 1) {
        net = deepFreeze(builderReducer(net, randomAction(r, net)));
      }
    }
  }, 60_000);
});
