// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MAX_NODES,
  communicatingNodes,
  makeTopology,
  type Topology,
  type TopologyKind,
} from './logic';

const none = { links: [], nodes: [] };
const cut = (links: string[] = [], nodes: string[] = []) => ({ links, nodes });
const KINDS: TopologyKind[] = ['bus', 'star', 'ring', 'mesh'];

describe('makeTopology: shape', () => {
  it('numbers the nodes n0, n1, ...', () => {
    expect(makeTopology('ring', 4).nodes).toEqual(['n0', 'n1', 'n2', 'n3']);
  });

  it('counts links: star(5) 4, ring(4) 4, mesh(4) 6, bus(4) 3', () => {
    expect(makeTopology('star', 5).links).toHaveLength(4);
    expect(makeTopology('ring', 4).links).toHaveLength(4);
    expect(makeTopology('mesh', 4).links).toHaveLength(6);
    expect(makeTopology('bus', 4).links).toHaveLength(3);
  });

  it('mesh has n(n-1)/2 links and ring has n, for many sizes', () => {
    for (let n = 3; n <= MAX_NODES; n += 1) {
      expect(makeTopology('mesh', n).links).toHaveLength((n * (n - 1)) / 2);
      expect(makeTopology('ring', n).links).toHaveLength(n);
      expect(makeTopology('bus', n).links).toHaveLength(n - 1);
      expect(makeTopology('star', n).links).toHaveLength(n - 1);
    }
  });

  it('names a link by its two ends, "n0-n3", and ids are unique', () => {
    expect(makeTopology('star', 5).links.map((l) => l.id)).toEqual([
      'n0-n1',
      'n0-n2',
      'n0-n3',
      'n0-n4',
    ]);
    expect(makeTopology('bus', 4).links.map((l) => l.id)).toEqual([
      'n0-n1',
      'n1-n2',
      'n2-n3',
    ]);
    expect(makeTopology('ring', 4).links.map((l) => l.id)).toEqual([
      'n0-n1',
      'n1-n2',
      'n2-n3',
      'n3-n0',
    ]);
    for (const kind of KINDS) {
      const ids = makeTopology(kind, 6).links.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every link joins two different, existing nodes', () => {
    for (const kind of KINDS) {
      const t = makeTopology(kind, 7);
      for (const l of t.links) {
        expect(l.a).not.toBe(l.b);
        expect(t.nodes).toContain(l.a);
        expect(t.nodes).toContain(l.b);
      }
    }
  });

  it('the star hub is n0 and every spoke touches it', () => {
    const t = makeTopology('star', 5);
    expect(t.links.every((l) => l.a === 'n0')).toBe(true);
  });

  it('records its kind', () => {
    expect(makeTopology('mesh', 3).kind).toBe('mesh');
  });

  it('throws RangeError for n < 3, non-integers, non-finite and above the limit', () => {
    for (const bad of [2, 1, 0, -4, 3.5, NaN, Infinity, -Infinity]) {
      expect(() => makeTopology('star', bad), String(bad)).toThrow(RangeError);
    }
    expect(() => makeTopology('mesh', MAX_NODES + 1)).toThrow(RangeError);
    expect(() => makeTopology('mesh', MAX_NODES)).not.toThrow();
    expect(() => makeTopology('mesh', 3)).not.toThrow();
  });

  it('throws RangeError for a kind that does not exist', () => {
    expect(() => makeTopology('tree' as TopologyKind, 4)).toThrow(RangeError);
  });
});

describe('communicatingNodes: nothing broken', () => {
  it('everyone talks in every topology', () => {
    for (const kind of KINDS) {
      const t = makeTopology(kind, 5);
      expect(communicatingNodes(t, none)).toEqual(t.nodes);
    }
  });
});

describe('communicatingNodes: bus', () => {
  const bus = makeTopology('bus', 4);
  it('a broken backbone link stops everyone, wherever it is', () => {
    for (const l of bus.links) {
      expect(communicatingNodes(bus, cut([l.id])), l.id).toEqual([]);
    }
  });
  it('a broken node only removes itself', () => {
    expect(communicatingNodes(bus, cut([], ['n2']))).toEqual([
      'n0',
      'n1',
      'n3',
    ]);
    expect(communicatingNodes(bus, cut([], ['n0']))).toEqual([
      'n1',
      'n2',
      'n3',
    ]);
  });
  it('a broken backbone link wins over a broken node', () => {
    expect(communicatingNodes(bus, cut(['n0-n1'], ['n2']))).toEqual([]);
  });
  it('one working device left is not enough to talk', () => {
    expect(communicatingNodes(bus, cut([], ['n0', 'n1', 'n2']))).toEqual([]);
    expect(communicatingNodes(bus, cut([], ['n0', 'n1']))).toEqual([
      'n2',
      'n3',
    ]);
  });
});

describe('communicatingNodes: star', () => {
  const star = makeTopology('star', 5);
  it('a broken spoke isolates only that node', () => {
    expect(communicatingNodes(star, cut(['n0-n3']))).toEqual([
      'n0',
      'n1',
      'n2',
      'n4',
    ]);
  });
  it('a broken hub stops everyone', () => {
    expect(communicatingNodes(star, cut([], ['n0']))).toEqual([]);
  });
  it('a broken spoke device removes only that device', () => {
    expect(communicatingNodes(star, cut([], ['n2']))).toEqual([
      'n0',
      'n1',
      'n3',
      'n4',
    ]);
  });
  it('the hub and one spoke still make two devices that talk', () => {
    expect(communicatingNodes(star, cut(['n0-n1', 'n0-n2', 'n0-n3']))).toEqual([
      'n0',
      'n4',
    ]);
  });
  it('every spoke cut leaves nobody', () => {
    expect(communicatingNodes(star, cut(star.links.map((l) => l.id)))).toEqual(
      [],
    );
  });
});

describe('communicatingNodes: ring', () => {
  const ring = makeTopology('ring', 4);
  it('any one broken link stops everyone', () => {
    for (const l of ring.links) {
      expect(communicatingNodes(ring, cut([l.id])), l.id).toEqual([]);
    }
  });
  it('any one broken node stops everyone', () => {
    for (const n of ring.nodes) {
      expect(communicatingNodes(ring, cut([], [n])), n).toEqual([]);
    }
  });
});

describe('communicatingNodes: mesh', () => {
  const mesh = makeTopology('mesh', 4);
  it('reroutes around two broken links', () => {
    expect(communicatingNodes(mesh, cut(['n0-n1', 'n0-n2']))).toEqual(
      mesh.nodes,
    );
  });
  it('a node whose links are all broken is left out', () => {
    expect(communicatingNodes(mesh, cut(['n0-n1', 'n0-n2', 'n0-n3']))).toEqual([
      'n1',
      'n2',
      'n3',
    ]);
  });
  it('a broken node leaves the rest talking', () => {
    expect(communicatingNodes(mesh, cut([], ['n1']))).toEqual([
      'n0',
      'n2',
      'n3',
    ]);
  });
  it('returns the largest connected group', () => {
    const six = makeTopology('mesh', 6);
    // Cut every link between {n0,n1,n2,n3} and {n4,n5}: the big group wins.
    const links = ['n4', 'n5'].flatMap((b) =>
      ['n0', 'n1', 'n2', 'n3'].map((a) => `${a}-${b}`),
    );
    expect(communicatingNodes(six, cut(links))).toEqual([
      'n0',
      'n1',
      'n2',
      'n3',
    ]);
  });
  it('breaks a tie by picking the group with the lowest-numbered node', () => {
    const four = makeTopology('mesh', 4);
    const split = ['n0-n2', 'n0-n3', 'n1-n2', 'n1-n3'];
    expect(communicatingNodes(four, cut(split))).toEqual(['n0', 'n1']);
    const split2 = ['n0-n1', 'n0-n3', 'n1-n2', 'n2-n3'];
    expect(communicatingNodes(four, cut(split2))).toEqual(['n0', 'n2']);
  });
  it('lone devices with no partner give nobody', () => {
    const three = makeTopology('mesh', 3);
    expect(communicatingNodes(three, cut(['n0-n1', 'n0-n2', 'n1-n2']))).toEqual(
      [],
    );
  });
  it('a broken node that cuts the group in two keeps the larger half', () => {
    // A partial mesh drawn by hand: a path n0-n1-n2-n3-n4. Break n1.
    const path: Topology = {
      kind: 'mesh',
      nodes: ['n0', 'n1', 'n2', 'n3', 'n4'],
      links: [
        { id: 'a', a: 'n0', b: 'n1' },
        { id: 'b', a: 'n1', b: 'n2' },
        { id: 'c', a: 'n2', b: 'n3' },
        { id: 'd', a: 'n3', b: 'n4' },
      ],
    };
    expect(communicatingNodes(path, cut([], ['n1']))).toEqual([
      'n2',
      'n3',
      'n4',
    ]);
  });
});

describe('communicatingNodes: hostile input', () => {
  const star = makeTopology('star', 4);
  const baseline = communicatingNodes(star, none);

  it('ignores unknown link and node ids', () => {
    expect(communicatingNodes(star, cut(['zzz', 'n9-n9'], ['n99']))).toEqual(
      baseline,
    );
  });
  it('ignores duplicates', () => {
    expect(communicatingNodes(star, cut(['n0-n3', 'n0-n3', 'n0-n3']))).toEqual(
      communicatingNodes(star, cut(['n0-n3'])),
    );
  });
  it('ignores values that are not strings', () => {
    const odd = { links: [1, null, {}, ['n0-n1']], nodes: [undefined, 7] };
    expect(
      communicatingNodes(star, odd as unknown as ReturnType<typeof cut>),
    ).toEqual(baseline);
  });
  it('does not throw for broken that is not an object or has no arrays', () => {
    for (const bad of [undefined, null, 5, 'x', [], {}, { links: 'n0-n1' }]) {
      expect(
        communicatingNodes(star, bad as unknown as ReturnType<typeof cut>),
        JSON.stringify(bad),
      ).toEqual(baseline);
    }
  });
  it('does not treat object built-ins as ids', () => {
    expect(
      communicatingNodes(star, cut(['constructor', '__proto__'], ['toString'])),
    ).toEqual(baseline);
  });
  it('does not throw for a malformed topology', () => {
    for (const bad of [undefined, null, {}, { kind: 'star' }, 5]) {
      expect(communicatingNodes(bad as unknown as Topology, none)).toEqual([]);
    }
  });
  it('does not change its inputs', () => {
    const t = makeTopology('mesh', 4);
    const copy = structuredClone(t);
    const broken = cut(['n0-n1'], ['n3']);
    const brokenCopy = structuredClone(broken);
    communicatingNodes(t, broken);
    expect(t).toEqual(copy);
    expect(broken).toEqual(brokenCopy);
  });
});
