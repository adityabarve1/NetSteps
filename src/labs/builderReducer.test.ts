import { describe, expect, it } from 'vitest';
import {
  CANVAS,
  MAX_DEVICES,
  MAX_SWITCH_LINKS,
  builderReducer,
  canConnect,
} from '@/labs/builderReducer';
import { add, empty, names, run } from '@/labs/builderTestKit';
import type { Network } from '@/netcore/network';

describe('addDevice', () => {
  it('names devices PC1, PC2, Switch1 and Server1 with matching ids', () => {
    const net = run(
      empty(),
      add('pc'),
      add('pc'),
      add('switch'),
      add('server'),
    );
    expect(names(net)).toEqual(['PC1', 'PC2', 'Switch1', 'Server1']);
    expect(net.devices.map((d) => d.id)).toEqual([
      'pc1',
      'pc2',
      'switch1',
      'server1',
    ]);
    expect(net.devices.map((d) => d.kind)).toEqual([
      'pc',
      'pc',
      'switch',
      'server',
    ]);
  });

  it('starts a device with no address', () => {
    const [d] = run(empty(), add('pc')).devices;
    expect(d).toBeDefined();
    expect(d?.ip).toBeUndefined();
    expect(d?.mask).toBeUndefined();
    expect(d?.gateway).toBeUndefined();
  });

  it('reuses the smallest free number after a removal, never a duplicate', () => {
    const net = run(
      empty(),
      add('pc'),
      add('pc'),
      add('pc'),
      { type: 'removeDevice', id: 'pc2' },
      add('pc'),
      add('pc'),
    );
    expect(names(net)).toEqual(['PC1', 'PC3', 'PC2', 'PC4']);
    expect(new Set(net.devices.map((d) => d.id)).size).toBe(4);
  });

  it('skips a name or id already taken by a hand-made device', () => {
    const start: Network = {
      devices: [
        { id: 'x', kind: 'pc', name: 'pc1', x: 1, y: 1 },
        { id: 'pc2', kind: 'server', name: 'Box', x: 1, y: 1 },
      ],
      links: [],
    };
    expect(names(run(start, add('pc')))).toEqual(['pc1', 'Box', 'PC3']);
  });

  it('ignores an unknown kind', () => {
    const start = empty();
    // @ts-expect-error -- a hostile value that the type system would block
    const next = builderReducer(start, add('router'));
    expect(next).toBe(start);
  });

  it('stops at the device cap', () => {
    let net = empty();
    for (let i = 0; i < MAX_DEVICES + 5; i += 1) net = run(net, add('pc'));
    expect(net.devices).toHaveLength(MAX_DEVICES);
    expect(run(net, add('switch'))).toBe(net);
  });

  it.each([
    [NaN, NaN],
    [Infinity, -Infinity],
    [-500, 9999],
    [1e308, -1e308],
  ])('clamps a position (%s, %s) into the canvas', (x, y) => {
    const [d] = run(empty(), add('pc', x, y)).devices;
    expect(d?.x).toBeGreaterThanOrEqual(CANVAS.minX);
    expect(d?.x).toBeLessThanOrEqual(CANVAS.maxX);
    expect(d?.y).toBeGreaterThanOrEqual(CANVAS.minY);
    expect(d?.y).toBeLessThanOrEqual(CANVAS.maxY);
  });

  it('keeps an in-range position as given', () => {
    const [d] = run(empty(), add('pc', 120, 90)).devices;
    expect([d?.x, d?.y]).toEqual([120, 90]);
  });
});

describe('connect', () => {
  const three = (): Network =>
    run(empty(), add('pc'), add('pc'), add('switch'), add('server'));

  it('adds a link with a unique, predictable id', () => {
    const net = run(
      three(),
      { type: 'connect', a: 'pc1', b: 'switch1' },
      { type: 'connect', a: 'switch1', b: 'pc2' },
    );
    expect(net.links).toEqual([
      { id: 'link1', a: 'pc1', b: 'switch1' },
      { id: 'link2', a: 'switch1', b: 'pc2' },
    ]);
  });

  it('reuses the smallest free link id after a disconnect', () => {
    const net = run(
      three(),
      { type: 'connect', a: 'pc1', b: 'switch1' },
      { type: 'connect', a: 'pc2', b: 'switch1' },
      { type: 'disconnect', linkId: 'link1' },
      { type: 'connect', a: 'server1', b: 'switch1' },
    );
    expect(net.links.map((l) => l.id)).toEqual(['link2', 'link1']);
  });

  it('ignores a self-link, unknown ids and duplicates in either order', () => {
    const base = run(three(), { type: 'connect', a: 'pc1', b: 'switch1' });
    for (const a of [
      { type: 'connect', a: 'pc1', b: 'pc1' },
      { type: 'connect', a: 'pc1', b: 'nope' },
      { type: 'connect', a: 'nope', b: 'pc1' },
      { type: 'connect', a: 'pc1', b: 'switch1' },
      { type: 'connect', a: 'switch1', b: 'pc1' },
    ] as const) {
      expect(builderReducer(base, a)).toBe(base);
    }
  });

  it('lets a pc or server take only one cable', () => {
    const base = run(three(), { type: 'connect', a: 'pc1', b: 'switch1' });
    expect(builderReducer(base, { type: 'connect', a: 'pc1', b: 'pc2' })).toBe(
      base,
    );
    expect(
      builderReducer(base, { type: 'connect', a: 'server1', b: 'pc1' }),
    ).toBe(base);
    const s = run(base, { type: 'connect', a: 'server1', b: 'switch1' });
    expect(builderReducer(s, { type: 'connect', a: 'server1', b: 'pc2' })).toBe(
      s,
    );
  });

  it('lets a switch take at most 8 cables', () => {
    let net = run(empty(), add('switch'), add('switch'));
    for (let i = 0; i < 9; i += 1) net = run(net, add('pc'));
    for (let i = 1; i <= 9; i += 1) {
      net = run(net, { type: 'connect', a: 'switch1', b: `pc${String(i)}` });
    }
    expect(net.links).toHaveLength(MAX_SWITCH_LINKS);
    expect(net.links.some((l) => l.b === 'pc9')).toBe(false);
    // The full switch also refuses another switch.
    expect(
      builderReducer(net, { type: 'connect', a: 'switch2', b: 'switch1' }),
    ).toBe(net);
  });

  it('allows a direct pc to pc cable', () => {
    const net = run(three(), { type: 'connect', a: 'pc1', b: 'pc2' });
    expect(net.links).toHaveLength(1);
  });

  it('explains why a cable is refused', () => {
    const net = run(three(), { type: 'connect', a: 'pc1', b: 'switch1' });
    expect(canConnect(net, 'pc1', 'pc1')).toEqual({
      ok: false,
      reason: 'same-device',
    });
    expect(canConnect(net, 'pc1', 'zzz')).toEqual({
      ok: false,
      reason: 'unknown-device',
    });
    expect(canConnect(net, 'switch1', 'pc1')).toEqual({
      ok: false,
      reason: 'already-linked',
    });
    expect(canConnect(net, 'pc1', 'pc2')).toEqual({
      ok: false,
      reason: 'a-full',
    });
    expect(canConnect(net, 'pc2', 'pc1')).toEqual({
      ok: false,
      reason: 'b-full',
    });
    expect(canConnect(net, 'pc2', 'switch1')).toEqual({ ok: true });
  });
});

describe('removeDevice and disconnect', () => {
  const wired = (): Network =>
    run(
      empty(),
      add('pc'),
      add('pc'),
      add('switch'),
      { type: 'connect', a: 'pc1', b: 'switch1' },
      { type: 'connect', a: 'pc2', b: 'switch1' },
    );

  it('removes a device and every cable on it', () => {
    const net = run(wired(), { type: 'removeDevice', id: 'switch1' });
    expect(names(net)).toEqual(['PC1', 'PC2']);
    expect(net.links).toEqual([]);
  });

  it('removing an end device removes only its own cable', () => {
    const net = run(wired(), { type: 'removeDevice', id: 'pc1' });
    expect(net.links).toEqual([{ id: 'link2', a: 'pc2', b: 'switch1' }]);
  });

  it('disconnect removes just that cable', () => {
    const net = run(wired(), { type: 'disconnect', linkId: 'link1' });
    expect(net.devices).toHaveLength(3);
    expect(net.links).toEqual([{ id: 'link2', a: 'pc2', b: 'switch1' }]);
  });

  it('ignores unknown ids', () => {
    const net = wired();
    expect(builderReducer(net, { type: 'removeDevice', id: 'zzz' })).toBe(net);
    expect(builderReducer(net, { type: 'disconnect', linkId: 'zzz' })).toBe(
      net,
    );
  });
});
