// Where to draw a topology, and what to call its parts. Pure: no React.
//
// Designed for 3 to 8 nodes (the lesson draws 5 or 6, see SIM_NODES): the device
// boxes never overlap in that range, in the wide and in the compact (phone)
// drawing. `makeTopology` allows up to 12 nodes for the pure logic, but this
// layout is not meant for more than 8: in the wide scene boxes would overlap
// (bus from 9, ring and mesh from 11, star at 12). layout.test.ts pins 3 to 8.

import type { Topology } from './logic';

export type Point = { x: number; y: number };
export type Segment = { from: Point; to: Point };
export type Scene = {
  width: number;
  height: number;
  /** The centre of each device box, by node id. */
  nodes: Record<string, Point>;
  /** Where each link is drawn, by link id. */
  links: Record<string, Segment>;
  /** Bus only: the short stub from the backbone to each device. */
  drops: { node: string; segment: Segment }[];
  /** Compact bus: the state words sit beside a device instead of below it. */
  labelsBeside: boolean;
  /** Nodes near the top of a circle: their state words go above the box, away from the links. */
  labelAbove: string[];
};

export const NODE_W = 44;
export const NODE_H = 30;
export const WIDE = { width: 400, height: 250 };
export const COMPACT = { width: 280, height: 320 };

const LETTERS = 'ABCDEFGHIJKL';

function index(id: string): number {
  const m = /^n(\d+)$/.exec(id);
  return m?.[1] === undefined ? -1 : Number(m[1]);
}

/** What the drawing calls a node: the star's hub is "Switch", the rest A, B, C... */
export function nodeLabel(t: Topology, id: string): string {
  const i = index(id);
  if (!Number.isInteger(i) || i < 0) return id;
  if (t.kind === 'star') {
    if (i === 0) return 'Switch';
    return LETTERS[i - 1] ?? id;
  }
  return LETTERS[i] ?? id;
}

/** "A to B": the words for a cable between two nodes. */
export function linkLabel(t: Topology, id: string): string {
  const l = t.links.find((x) => x.id === id);
  if (l === undefined) return id;
  return `${nodeLabel(t, l.a)} to ${nodeLabel(t, l.b)}`;
}

const round = (value: number): number => Math.round(value * 10) / 10;

function circle(count: number, centre: Point, radius: number): Point[] {
  return Array.from({ length: count }, (_, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / count;
    return {
      x: round(centre.x + radius * Math.cos(angle)),
      y: round(centre.y + radius * Math.sin(angle)),
    };
  });
}

/** Positions for the bus: a backbone with a device hanging off each tap. */
function busScene(t: Topology, compact: boolean): Scene {
  const size = compact ? COMPACT : WIDE;
  const count = t.nodes.length;
  const nodes: Record<string, Point> = {};
  const taps: Record<string, Point> = {};
  const drops: Scene['drops'] = [];
  t.nodes.forEach((id, i) => {
    const along = (limit: number, margin: number) =>
      round(margin + (i * (limit - 2 * margin)) / Math.max(1, count - 1));
    const tap = compact
      ? { x: 70, y: along(size.height, 34) }
      : { x: along(size.width, 40), y: 60 };
    const box = compact ? { x: 190, y: tap.y } : { x: tap.x, y: 150 };
    nodes[id] = box;
    taps[id] = tap;
    drops.push({
      node: id,
      segment: {
        from: tap,
        to: compact
          ? { x: box.x - NODE_W / 2, y: box.y }
          : { x: box.x, y: box.y - NODE_H / 2 },
      },
    });
  });
  const links: Record<string, Segment> = {};
  for (const l of t.links) {
    const from = taps[l.a];
    const to = taps[l.b];
    if (from !== undefined && to !== undefined) links[l.id] = { from, to };
  }
  return {
    ...size,
    nodes,
    links,
    drops,
    labelsBeside: compact,
    labelAbove: [],
  };
}

/** Where to draw `t`. The compact version is tall and narrow for a phone. */
export function layoutTopology(t: Topology, compact: boolean): Scene {
  if (t.kind === 'bus') return busScene(t, compact);
  const size = compact ? COMPACT : WIDE;
  const centre = { x: size.width / 2, y: size.height / 2 - 5 };
  // The tall phone drawing has room for a wider circle than the wide one.
  const radius = compact ? 105 : 77;
  const nodes: Record<string, Point> = {};
  if (t.kind === 'star') {
    // The hub (first node) in the middle, the others around it.
    const [hub, ...rest] = t.nodes;
    if (hub !== undefined) nodes[hub] = centre;
    circle(rest.length, centre, radius).forEach((p, k) => {
      const id = rest[k];
      if (id !== undefined) nodes[id] = p;
    });
  } else {
    circle(t.nodes.length, centre, radius).forEach((p, k) => {
      const id = t.nodes[k];
      if (id !== undefined) nodes[id] = p;
    });
  }
  const links: Record<string, Segment> = {};
  for (const l of t.links) {
    const from = nodes[l.a];
    const to = nodes[l.b];
    if (from !== undefined && to !== undefined) links[l.id] = { from, to };
  }
  const labelAbove = Object.entries(nodes)
    .filter(([, p]) => p.y < centre.y - 0.7 * radius)
    .map(([id]) => id);
  return { ...size, nodes, links, drops: [], labelsBeside: false, labelAbove };
}
