// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { communicatingNodes, makeTopology } from './logic';
import {
  SIM_NODES,
  TOPOLOGY_STEPS,
  sceneDescription,
  statusSentence,
  topologyOf,
} from './steps';

describe('statusSentence', () => {
  const ring = makeTopology('ring', 5);
  it('says everyone can talk', () => {
    expect(statusSentence(ring, ring.nodes)).toBe(
      'All 5 devices can talk to each other.',
    );
  });
  it('says nobody can talk', () => {
    expect(statusSentence(ring, [])).toBe('No device can talk to another.');
  });
  it('lists who can still talk, with the count', () => {
    expect(statusSentence(ring, ['n0', 'n1', 'n3', 'n4'])).toBe(
      'A, B, D and E can still talk (4 of 5 devices).',
    );
    expect(statusSentence(ring, ['n0', 'n4'])).toBe(
      'A and E can still talk (2 of 5 devices).',
    );
  });
});

describe('statusSentence for a star counts the switch apart from the computers', () => {
  const star = topologyOf('star');
  it('says all five computers and the switch', () => {
    expect(statusSentence(star, star.nodes)).toBe(
      'All 5 computers and the switch can talk to each other.',
    );
  });
  it('counts only computers in the fraction', () => {
    expect(statusSentence(star, ['n0', 'n1', 'n2'])).toBe(
      'Switch, A and B can still talk (the switch and 2 of 5 computers).',
    );
  });
  it('never says "6 devices" anywhere in the star steps', () => {
    for (const s of TOPOLOGY_STEPS.filter((x) => x.kind === 'star')) {
      expect(s.caption).not.toMatch(/6 devices|of 6/);
      expect(s.caption).not.toMatch(/All 6/);
    }
    expect(TOPOLOGY_STEPS[3]?.caption).toContain(
      'All 5 computers and the switch',
    );
  });
  it('the picture description counts five devices with a switch', () => {
    expect(
      sceneDescription(star, { links: [], nodes: [] }, star.nodes),
    ).toContain('star network of 5 devices with a switch in the middle');
  });
});

describe('the simulation steps', () => {
  it('has 12 steps: intact plus two failures for each shape', () => {
    expect(TOPOLOGY_STEPS).toHaveLength(12);
    expect(TOPOLOGY_STEPS.map((s) => s.kind)).toEqual([
      'bus',
      'bus',
      'bus',
      'star',
      'star',
      'star',
      'ring',
      'ring',
      'ring',
      'mesh',
      'mesh',
      'mesh',
    ]);
  });

  it('every step starts with nothing broken for the first of its shape', () => {
    for (const k of [0, 3, 6, 9]) {
      expect(TOPOLOGY_STEPS[k]?.broken).toEqual({ links: [], nodes: [] });
    }
  });

  it('every step breaks only parts that exist, and `ok` comes from communicatingNodes', () => {
    for (const s of TOPOLOGY_STEPS) {
      const t = topologyOf(s.kind);
      expect(t.nodes).toHaveLength(SIM_NODES[s.kind]);
      for (const id of s.broken.links) {
        expect(t.links.map((l) => l.id)).toContain(id);
      }
      for (const id of s.broken.nodes) expect(t.nodes).toContain(id);
      expect(s.ok).toEqual(communicatingNodes(t, s.broken));
    }
  });

  it('every caption is one to three sentences and ends with the verdict', () => {
    for (const s of TOPOLOGY_STEPS) {
      const t = topologyOf(s.kind);
      expect(s.caption.endsWith(statusSentence(t, s.ok))).toBe(true);
      expect(s.caption.length).toBeGreaterThan(40);
    }
  });

  it('tells the failure story the lesson teaches', () => {
    const c = TOPOLOGY_STEPS.map((s) => s.caption);
    expect(c[0]).toContain('All 5 devices can talk');
    expect(c[1]).toContain('No device can talk to another.');
    expect(c[2]).toContain('A, B, D and E can still talk (4 of 5 devices).');
    expect(c[4]).toContain(
      'Switch, A, B, D and E can still talk (the switch and 4 of 5 computers).',
    );
    expect(c[5]).toContain('No device can talk to another.');
    expect(c[7]).toContain('No device can talk to another.');
    expect(c[8]).toContain('No device can talk to another.');
    expect(c[10]).toContain('All 5 devices can talk');
    expect(c[11]).toContain('B, C, D and E can still talk (4 of 5 devices).');
  });

  it('the captions name the cable or device that is broken', () => {
    expect(TOPOLOGY_STEPS[1]?.broken.links).toEqual(['n1-n2']);
    expect(TOPOLOGY_STEPS[1]?.caption).toContain('between B and C');
    expect(TOPOLOGY_STEPS[2]?.broken.nodes).toEqual(['n2']);
    expect(TOPOLOGY_STEPS[2]?.caption).toContain('Device C fails');
    expect(TOPOLOGY_STEPS[4]?.broken.links).toEqual(['n0-n3']);
    expect(TOPOLOGY_STEPS[4]?.caption).toContain('switch to C');
    expect(TOPOLOGY_STEPS[5]?.broken.nodes).toEqual(['n0']);
    expect(TOPOLOGY_STEPS[7]?.broken.links).toEqual(['n1-n2']);
    expect(TOPOLOGY_STEPS[7]?.caption).toContain('between B and C');
    expect(TOPOLOGY_STEPS[8]?.broken.nodes).toEqual(['n2']);
    expect(TOPOLOGY_STEPS[10]?.broken.links).toEqual(['n0-n1', 'n0-n2']);
    expect(TOPOLOGY_STEPS[10]?.caption).toContain('A to B and A to C');
  });

  it('numbers match the lesson: 10 cables in the five-device mesh', () => {
    expect(topologyOf('mesh').links).toHaveLength(10);
    expect(TOPOLOGY_STEPS[9]?.caption).toContain('10 cables');
    expect(TOPOLOGY_STEPS[11]?.broken.links).toHaveLength(4);
  });
});

describe('what the lesson draws', () => {
  it('draws at most 8 nodes, the range the layout keeps free of overlaps', () => {
    for (const n of Object.values(SIM_NODES)) expect(n).toBeLessThanOrEqual(8);
  });
});

describe('sceneDescription', () => {
  it('names the shape, the broken parts and who can still talk', () => {
    const s = TOPOLOGY_STEPS[2];
    if (s === undefined) throw new Error('missing step');
    const text = sceneDescription(topologyOf(s.kind), s.broken, s.ok);
    expect(text).toContain('bus');
    expect(text).toContain('Device C is down.');
    expect(text).toContain('A, B, D and E can still talk');
  });
  it('names a cut cable', () => {
    const t = topologyOf('star');
    const text = sceneDescription(t, { links: ['n0-n3'], nodes: [] }, []);
    expect(text).toContain('The cable Switch to C is cut.');
  });
  it('says nothing is broken when nothing is', () => {
    const t = topologyOf('ring');
    expect(sceneDescription(t, { links: [], nodes: [] }, t.nodes)).toContain(
      'Nothing is broken.',
    );
  });
});
