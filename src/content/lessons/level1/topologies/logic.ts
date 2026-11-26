// Pure logic of the lesson "Topologies". No React in this file.
//
// A topology is a graph: nodes (devices) and links (cables). The four shapes
// are built by `makeTopology`; `communicatingNodes` answers "after these parts
// fail, which devices can still talk to each other?" using the lesson's MODEL
// of each shape. The model is deliberately simple (see the Go deeper blocks
// for real-world exceptions such as dual rings or redundant switch links).
//
// Naming: nodes are `n0`, `n1`, ... A link is named by its two ends, written
// `<a>-<b>` (for example `n0-n3`). A star's hub is `n0`. A ring's closing link
// is `n<last>-n0`. The link ids of one topology are unique.

export type TopologyKind = 'bus' | 'star' | 'ring' | 'mesh';
export type TopologyLink = { id: string; a: string; b: string };
export type Topology = {
  kind: TopologyKind;
  nodes: string[];
  links: TopologyLink[];
};
export type Broken = { links: string[]; nodes: string[] };

export const MIN_NODES = 3;
/** The most nodes `makeTopology` builds: a full mesh of 12 already has 66 links. */
export const MAX_NODES = 12;

const link = (a: number, b: number): TopologyLink => ({
  id: `n${String(a)}-n${String(b)}`,
  a: `n${String(a)}`,
  b: `n${String(b)}`,
});

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function linksFor(kind: TopologyKind, n: number): TopologyLink[] {
  switch (kind) {
    case 'bus':
      // A chain: the backbone cut into one piece between neighbouring taps.
      return range(n - 1).map((i) => link(i, i + 1));
    case 'star':
      return range(n - 1).map((i) => link(0, i + 1));
    case 'ring':
      return range(n).map((i) => link(i, (i + 1) % n));
    case 'mesh':
      return range(n).flatMap((i) =>
        range(n - i - 1).map((k) => link(i, i + 1 + k)),
      );
  }
}

/**
 * Build one of the four shapes with `n` nodes. Bus: n - 1 backbone links.
 * Star: hub n0 plus n - 1 spokes. Ring: n links. Mesh: n(n - 1) / 2 links.
 * Throws RangeError unless n is a whole number from 3 to 12, or for an
 * unknown kind.
 */
export function makeTopology(kind: TopologyKind, n: number): Topology {
  if (
    typeof n !== 'number' ||
    !Number.isInteger(n) ||
    n < MIN_NODES ||
    n > MAX_NODES
  ) {
    throw new RangeError(
      `A topology needs a whole number of nodes from ${String(MIN_NODES)} to ${String(MAX_NODES)}, got ${String(n)}`,
    );
  }
  if (!['bus', 'star', 'ring', 'mesh'].includes(kind)) {
    throw new RangeError(`Unknown topology kind: ${kind as string}`);
  }
  return {
    kind,
    nodes: range(n).map((i) => `n${String(i)}`),
    links: linksFor(kind, n),
  };
}

// The ids in `value` that are also in `known`. Anything else is ignored:
// non-arrays, non-strings, unknown ids. Duplicates collapse (it is a Set).
function knownIds(value: unknown, known: Set<string>): Set<string> {
  const found = new Set<string>();
  if (!Array.isArray(value)) return found;
  for (const item of value as unknown[]) {
    if (typeof item === 'string' && known.has(item)) found.add(item);
  }
  return found;
}

// The largest group of connected nodes. A tie goes to the group whose first
// node comes first in `nodes`. Result keeps the order of `nodes`.
function largestGroup(nodes: string[], links: TopologyLink[]): string[] {
  const alive = new Set(nodes);
  const seen = new Set<string>();
  let best: string[] = [];
  for (const start of nodes) {
    if (seen.has(start)) continue;
    const group = new Set([start]);
    const queue = [start];
    seen.add(start);
    for (const current of queue) {
      for (const l of links) {
        const next = l.a === current ? l.b : l.b === current ? l.a : undefined;
        if (next === undefined || !alive.has(next) || group.has(next)) continue;
        group.add(next);
        seen.add(next);
        queue.push(next);
      }
    }
    if (group.size > best.length) best = nodes.filter((n) => group.has(n));
  }
  return best;
}

/**
 * Which nodes can still talk to each other when the given links and nodes are
 * broken? Returns them in node order, or `[]` when fewer than two can talk.
 *
 * The model, per shape:
 * - bus: any broken backbone link stops everyone; a broken node removes itself.
 * - star: a broken hub stops everyone; a broken spoke (or spoke device)
 *   removes only that device.
 * - ring (single ring): any broken link or node stops everyone.
 * - mesh: traffic reroutes, so the largest connected group keeps talking.
 *
 * Unknown ids, duplicates, wrong types and a malformed topology are ignored,
 * never an error.
 */
export function communicatingNodes(t: Topology, broken: Broken): string[] {
  const nodes: unknown = (t as Topology | undefined | null)?.nodes;
  const links: unknown = (t as Topology | undefined | null)?.links;
  if (!Array.isArray(nodes) || !Array.isArray(links)) return [];
  const allNodes = (nodes as unknown[]).filter(
    (n): n is string => typeof n === 'string',
  );
  const allLinks = (links as TopologyLink[]).filter(
    (l) =>
      typeof l === 'object' &&
      typeof l.id === 'string' &&
      typeof l.a === 'string' &&
      typeof l.b === 'string',
  );

  const raw: unknown = broken;
  const isObject = typeof raw === 'object' && raw !== null;
  const badLinks = knownIds(
    isObject ? (raw as Broken).links : undefined,
    new Set(allLinks.map((l) => l.id)),
  );
  const badNodes = knownIds(
    isObject ? (raw as Broken).nodes : undefined,
    new Set(allNodes),
  );

  const aliveNodes = allNodes.filter((n) => !badNodes.has(n));
  const goodLinks = allLinks.filter((l) => !badLinks.has(l.id));
  const talking = (group: string[]): string[] =>
    group.length >= 2 ? group : [];

  switch (t.kind) {
    case 'bus':
      return badLinks.size > 0 ? [] : talking(aliveNodes);
    case 'ring':
      return badLinks.size > 0 || badNodes.size > 0 ? [] : talking(aliveNodes);
    case 'star': {
      const hub = allNodes[0];
      if (hub === undefined || badNodes.has(hub)) return [];
      const cutOff = new Set(
        allLinks
          .filter((l) => badLinks.has(l.id))
          .flatMap((l) => [l.a, l.b])
          .filter((n) => n !== hub),
      );
      return talking(aliveNodes.filter((n) => !cutOff.has(n)));
    }
    default:
      return talking(largestGroup(aliveNodes, goodLinks));
  }
}
