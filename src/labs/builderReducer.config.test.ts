import { describe, expect, it } from 'vitest';
import {
  CANVAS,
  MAX_DEVICES,
  builderReducer,
  nextFreePosition,
  normalizeNetwork,
  type BuilderAction,
} from '@/labs/builderReducer';
import { add, empty, run } from '@/labs/builderTestKit';
import { ping, type Network } from '@/netcore/network';

describe('setConfig (RF1)', () => {
  const one = (): Network => run(empty(), add('pc'), add('pc'), add('switch'));

  it('stores exactly the typed strings, with no trimming', () => {
    const net = run(one(), {
      type: 'setConfig',
      id: 'pc1',
      ip: ' 192.168.1.10 ',
      mask: '/24',
      gateway: '192.168.1.1',
    });
    const [d] = net.devices;
    expect(d?.ip).toBe(' 192.168.1.10 ');
    expect(d?.mask).toBe('/24');
    expect(d?.gateway).toBe('192.168.1.1');
  });

  it('treats an empty string as "not set" so the field is cleared', () => {
    const set = run(one(), {
      type: 'setConfig',
      id: 'pc1',
      ip: '192.168.1.10',
      mask: '/24',
      gateway: '192.168.1.1',
    });
    const cleared = run(set, {
      type: 'setConfig',
      id: 'pc1',
      ip: '',
      mask: '',
    });
    const [d] = cleared.devices;
    expect(d?.ip).toBeUndefined();
    expect(d?.mask).toBeUndefined();
    expect(d?.gateway).toBeUndefined();
    expect(d !== undefined && 'ip' in d).toBe(false);
  });

  it('accepts a hostile address and ping reports a failure instead of throwing', () => {
    const net = run(one(), {
      type: 'setConfig',
      id: 'pc1',
      ip: '999.1.1.1',
      mask: '',
    });
    expect(net.devices[0]?.ip).toBe('999.1.1.1');
    const result = ping(net, 'pc1', '192.168.1.20');
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('no-ip-config');
    expect(ping(net, 'pc1', '999.1.1.1').failure).toBe('unknown-host');
  });

  it('does not store an address on a switch', () => {
    const net = one();
    expect(
      builderReducer(net, {
        type: 'setConfig',
        id: 'switch1',
        ip: '1.2.3.4',
        mask: '/24',
      }),
    ).toBe(net);
  });

  it('ignores an unknown id and a change that changes nothing', () => {
    const net = run(one(), {
      type: 'setConfig',
      id: 'pc1',
      ip: '10.0.0.1',
      mask: '/8',
    });
    const same = {
      type: 'setConfig',
      id: 'pc1',
      ip: '10.0.0.1',
      mask: '/8',
    } as const;
    expect(builderReducer(net, same)).toBe(net);
    expect(builderReducer(net, { ...same, id: 'zzz' })).toBe(net);
  });
});

describe('moveDevice', () => {
  const one = (): Network => run(empty(), add('pc', 100, 100));

  it('moves a device and clamps to the canvas', () => {
    const moved = run(one(), { type: 'moveDevice', id: 'pc1', x: 200, y: 150 });
    expect([moved.devices[0]?.x, moved.devices[0]?.y]).toEqual([200, 150]);
    const clamped = run(one(), {
      type: 'moveDevice',
      id: 'pc1',
      x: -9,
      y: Infinity,
    });
    expect([clamped.devices[0]?.x, clamped.devices[0]?.y]).toEqual([
      CANVAS.minX,
      CANVAS.maxY,
    ]);
  });

  it('returns the same network for an unknown id or an unchanged position', () => {
    const net = one();
    expect(
      builderReducer(net, { type: 'moveDevice', id: 'zzz', x: 1, y: 1 }),
    ).toBe(net);
    expect(
      builderReducer(net, { type: 'moveDevice', id: 'pc1', x: 100, y: 100 }),
    ).toBe(net);
    expect(
      builderReducer(net, { type: 'moveDevice', id: 'pc1', x: -50, y: 100 }),
    ).not.toBe(net);
  });
});

describe('unknown actions and the same-object rule', () => {
  it('returns the same network for an unknown action type', () => {
    const net = empty();
    // @ts-expect-error -- a hostile action the type system would block
    expect(builderReducer(net, { type: 'explode' })).toBe(net);
  });
});

describe('hostile initial networks', () => {
  const hostile = (): Network => ({
    devices: [
      { id: 'pc1', kind: 'pc', name: 'PC1', x: 1, y: 1 },
      { id: 'pc1', kind: 'server', name: 'PC1', x: 5, y: 5 },
      { id: 'sw', kind: 'switch', name: 'SW', x: 1, y: 1 },
    ],
    links: [
      { id: 'l', a: 'pc1', b: 'ghost' },
      { id: 'l', a: 'sw', b: 'sw' },
      { id: 'm', a: 'pc1', b: 'sw' },
      { id: 'n', a: 'pc1', b: 'sw' },
    ],
  });

  it('survives every action without throwing', () => {
    const actions: BuilderAction[] = [
      add('pc'),
      { type: 'connect', a: 'pc1', b: 'sw' },
      { type: 'connect', a: 'sw', b: 'pc2' },
      { type: 'removeDevice', id: 'pc1' },
      { type: 'disconnect', linkId: 'l' },
      { type: 'setConfig', id: 'pc1', ip: 'x', mask: 'y' },
      { type: 'moveDevice', id: 'pc1', x: 1, y: 1 },
    ];
    for (const a of actions) {
      expect(() => builderReducer(hostile(), a)).not.toThrow();
    }
  });

  it('first device with an id wins, like ping', () => {
    const net = run(hostile(), {
      type: 'setConfig',
      id: 'pc1',
      ip: '1.1.1.1',
      mask: '/8',
    });
    expect(net.devices[0]?.ip).toBe('1.1.1.1');
    expect(net.devices[1]?.ip).toBeUndefined();
  });

  it('normalizeNetwork repairs duplicates, orphan links and over-cap links', () => {
    const fixed = normalizeNetwork(hostile());
    expect(fixed.devices.map((d) => d.id)).toEqual(['pc1', 'sw']);
    expect(fixed.links).toEqual([{ id: 'm', a: 'pc1', b: 'sw' }]);
  });

  it('normalizeNetwork caps devices, clamps positions and tolerates junk', () => {
    const many: Network = {
      devices: Array.from({ length: 30 }, (_, i) => ({
        id: `d${String(i)}`,
        kind: 'pc' as const,
        name: `D${String(i)}`,
        x: NaN,
        y: 1e9,
      })),
      links: [],
    };
    const fixed = normalizeNetwork(many);
    expect(fixed.devices).toHaveLength(MAX_DEVICES);
    expect(fixed.devices[0]?.x).toBe(CANVAS.minX);
    expect(fixed.devices[0]?.y).toBe(CANVAS.maxY);
    // @ts-expect-error -- deliberately wrong shape from a careless caller
    expect(normalizeNetwork({})).toEqual({ devices: [], links: [] });
    const clean = run(empty(), add('pc'));
    expect(normalizeNetwork(clean)).toEqual(clean);
  });
});

describe('nextFreePosition', () => {
  it('hands out a different, in-bounds spot for each device', () => {
    let net = empty();
    const seen = new Set<string>();
    for (let i = 0; i < MAX_DEVICES; i += 1) {
      const p = nextFreePosition(net);
      expect(p.x).toBeGreaterThanOrEqual(CANVAS.minX);
      expect(p.x).toBeLessThanOrEqual(CANVAS.maxX);
      expect(p.y).toBeGreaterThanOrEqual(CANVAS.minY);
      expect(p.y).toBeLessThanOrEqual(CANVAS.maxY);
      seen.add(`${String(p.x)},${String(p.y)}`);
      net = run(net, { type: 'addDevice', kind: 'pc', ...p });
    }
    expect(seen.size).toBe(MAX_DEVICES);
  });

  it('never throws when the grid is full', () => {
    const full = normalizeNetwork({
      devices: Array.from({ length: 12 }, (_, i) => ({
        id: `d${String(i)}`,
        kind: 'pc' as const,
        name: `D${String(i)}`,
        x: 60 + (i % 4) * 120,
        y: 50 + Math.floor(i / 4) * 100,
      })),
      links: [],
    });
    expect(() => nextFreePosition(full)).not.toThrow();
  });
});

describe('setConfig with values of the wrong type', () => {
  const base = (): Network => run(empty(), add('pc'));
  const bad = (field: 'ip' | 'mask' | 'gateway', value: unknown): Network =>
    builderReducer(base(), {
      type: 'setConfig',
      id: 'pc1',
      ip: '10.0.0.1',
      mask: '/24',
      ...{ [field]: value },
    });

  it.each(['ip', 'mask', 'gateway'] as const)(
    'ignores a non-string %s and returns the same network',
    (field) => {
      const net = base();
      expect(
        builderReducer(net, {
          type: 'setConfig',
          id: 'pc1',
          ip: '10.0.0.1',
          mask: '/24',
          ...{ [field]: 42 },
        }),
      ).toBe(net);
      expect(bad(field, { a: 1 }).devices[0]?.ip).toBeUndefined();
    },
  );
});
