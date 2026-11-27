// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NODE_H, NODE_W, layoutTopology, linkLabel, nodeLabel } from './layout';
import { makeTopology, type TopologyKind } from './logic';

const KINDS: TopologyKind[] = ['bus', 'star', 'ring', 'mesh'];

describe('layoutTopology', () => {
  for (const compact of [false, true]) {
    for (const kind of KINDS) {
      for (let n = 3; n <= 8; n += 1) {
        const where = `${kind} n=${String(n)} compact=${String(compact)}`;
        const t = makeTopology(kind, n);
        const scene = layoutTopology(t, compact);
        const ids = t.nodes;

        it(`${where}: gives every node a position and every link a segment`, () => {
          expect(Object.keys(scene.nodes)).toHaveLength(n);
          for (const id of ids) expect(scene.nodes[id]).toBeDefined();
          expect(Object.keys(scene.links)).toHaveLength(t.links.length);
        });

        it(`${where}: no two device boxes overlap`, () => {
          for (let i = 0; i < ids.length; i += 1) {
            for (let j = i + 1; j < ids.length; j += 1) {
              const a = scene.nodes[ids[i] ?? ''];
              const b = scene.nodes[ids[j] ?? ''];
              if (a === undefined || b === undefined) throw new Error('gap');
              const apart =
                Math.abs(a.x - b.x) >= NODE_W || Math.abs(a.y - b.y) >= NODE_H;
              expect(apart, `${ids[i] ?? ''} and ${ids[j] ?? ''}`).toBe(true);
            }
          }
        });

        it(`${where}: every box and its state words stay inside the drawing`, () => {
          for (const p of Object.values(scene.nodes)) {
            expect(p.x - NODE_W / 2).toBeGreaterThanOrEqual(0);
            expect(p.y - NODE_H / 2).toBeGreaterThanOrEqual(0);
            const below = scene.labelsBeside ? 0 : 16;
            const beside = scene.labelsBeside ? 60 : 0;
            expect(p.x + NODE_W / 2 + beside).toBeLessThanOrEqual(scene.width);
            expect(p.y + NODE_H / 2 + below).toBeLessThanOrEqual(scene.height);
          }
        });
      }
    }
  }

  it('is deterministic', () => {
    const t = makeTopology('mesh', 5);
    expect(layoutTopology(t, false)).toEqual(layoutTopology(t, false));
  });

  it('puts the star hub in the middle and spokes around it', () => {
    const t = makeTopology('star', 6);
    const scene = layoutTopology(t, false);
    expect(scene.nodes.n0).toEqual({
      x: scene.width / 2,
      y: scene.height / 2 - 5,
    });
    expect(scene.drops).toEqual([]);
  });

  it('draws the bus as a wide row, or a tall column on a phone', () => {
    const t = makeTopology('bus', 5);
    const wide = layoutTopology(t, false);
    const ys = new Set(Object.values(wide.nodes).map((p) => p.y));
    expect(ys.size).toBe(1);
    expect(wide.drops).toHaveLength(5);
    expect(wide.labelsBeside).toBe(false);
    const tall = layoutTopology(t, true);
    const xs = new Set(Object.values(tall.nodes).map((p) => p.x));
    expect(xs.size).toBe(1);
    expect(tall.labelsBeside).toBe(true);
    expect(tall.height).toBeGreaterThan(wide.height);
  });

  it('draws bus backbone pieces between neighbouring taps', () => {
    const scene = layoutTopology(makeTopology('bus', 4), false);
    const piece = scene.links['n1-n2'];
    expect(piece?.from.y).toBe(piece?.to.y);
    expect(piece?.from.x).toBeLessThan(piece?.to.x ?? 0);
  });
});

describe('labels', () => {
  it('calls the star hub "Switch" and the others A, B, C', () => {
    const t = makeTopology('star', 6);
    expect(t.nodes.map((id) => nodeLabel(t, id))).toEqual([
      'Switch',
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });
  it('calls the other shapes A, B, C from the first node', () => {
    for (const kind of ['bus', 'ring', 'mesh'] as const) {
      const t = makeTopology(kind, 5);
      expect(t.nodes.map((id) => nodeLabel(t, id)).join('')).toBe('ABCDE');
    }
  });
  it('falls back to the id for something it does not know', () => {
    const t = makeTopology('ring', 4);
    expect(nodeLabel(t, 'x')).toBe('x');
    expect(linkLabel(t, 'nope')).toBe('nope');
  });
  it('names a link by its two ends', () => {
    const star = makeTopology('star', 6);
    expect(linkLabel(star, 'n0-n3')).toBe('Switch to C');
    const ring = makeTopology('ring', 5);
    expect(linkLabel(ring, 'n4-n0')).toBe('E to A');
  });
});

describe('state words above the box', () => {
  it('goes to the top node of a circle, never to the star hub or the bus', () => {
    const ring = layoutTopology(makeTopology('ring', 5), false);
    expect(ring.labelAbove).toEqual(['n0']);
    const star = layoutTopology(makeTopology('star', 6), false);
    expect(star.labelAbove).toEqual(['n1']);
    expect(layoutTopology(makeTopology('bus', 5), false).labelAbove).toEqual(
      [],
    );
    expect(layoutTopology(makeTopology('bus', 5), true).labelAbove).toEqual([]);
  });
  it('leaves room above the box for the words', () => {
    for (const kind of ['ring', 'mesh', 'star'] as const) {
      for (const compact of [false, true]) {
        const scene = layoutTopology(makeTopology(kind, 6), compact);
        for (const id of scene.labelAbove) {
          const p = scene.nodes[id];
          expect((p?.y ?? 0) - NODE_H / 2 - 16).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
