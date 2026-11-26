import { describe, expect, it } from 'vitest';
import { CANVAS, MAX_DEVICES, nextFreePosition } from '@/labs/builderReducer';
import { empty, run } from '@/labs/builderTestKit';
import type { DeviceKind, Network } from '@/netcore/network';

/** Distance from point p to the segment a-b. */
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// A device box is about 100px wide, so a cable closer than this to another node's
// centre would run behind its icon.
const ICON_CLEARANCE = 45;

function build(kinds: DeviceKind[]): Network {
  let net = empty();
  for (const kind of kinds) {
    net = run(net, {
      type: 'addDevice',
      kind,
      ...nextFreePosition(net),
    });
  }
  return net;
}

/** Every pair of the first `count` devices whose straight cable passes behind a third. */
function blockedCables(net: Network, count: number): string[] {
  const nodes = net.devices.slice(0, count);
  const blocked: string[] = [];
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id >= b.id) continue;
      for (const other of nodes) {
        if (other === a || other === b) continue;
        if (distanceToSegment(other, a, b) < ICON_CLEARANCE) {
          blocked.push(`${a.id}-${b.id} behind ${other.id}`);
        }
      }
    }
  }
  return blocked;
}

describe('automatic placement of new devices', () => {
  it('keeps up to 12 devices inside the canvas and apart from each other', () => {
    const net = build(Array.from({ length: MAX_DEVICES }, () => 'pc'));
    expect(net.devices).toHaveLength(MAX_DEVICES);
    for (const d of net.devices) {
      expect(d.x).toBeGreaterThanOrEqual(CANVAS.minX);
      expect(d.x).toBeLessThanOrEqual(CANVAS.maxX);
      expect(d.y).toBeGreaterThanOrEqual(CANVAS.minY);
      expect(d.y).toBeLessThanOrEqual(CANVAS.maxY);
    }
    for (const a of net.devices) {
      for (const b of net.devices) {
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('is deterministic', () => {
    const kinds: DeviceKind[] = ['pc', 'switch', 'pc', 'server'];
    expect(build(kinds).devices).toEqual(build(kinds).devices);
  });

  it('puts PC1, Switch1 and PC2 in a triangle, so no cable runs behind a device', () => {
    const net = build(['pc', 'switch', 'pc']);
    expect(blockedCables(net, 3)).toEqual([]);
  });

  it('keeps every cable between the first six devices clear of the others', () => {
    const net = build(['pc', 'pc', 'pc', 'switch', 'server', 'pc']);
    expect(blockedCables(net, 6)).toEqual([]);
  });

  it('the helper does catch a cable behind a device (guards the check itself)', () => {
    const row: Network = {
      devices: [
        { id: 'a', kind: 'pc', name: 'A', x: 60, y: 50 },
        { id: 'b', kind: 'pc', name: 'B', x: 180, y: 50 },
        { id: 'c', kind: 'pc', name: 'C', x: 300, y: 50 },
      ],
      links: [],
    };
    expect(blockedCables(row, 3)).toEqual(['a-c behind b']);
  });
});
