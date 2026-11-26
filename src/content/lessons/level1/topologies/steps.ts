// The scripted steps of the lesson's primary simulation, and the words that
// describe a scene. Pure: no React. Every verdict comes from
// `communicatingNodes`, so the captions cannot disagree with the logic.

import { linkLabel, nodeLabel } from './layout';
import {
  communicatingNodes,
  makeTopology,
  type Broken,
  type Topology,
  type TopologyKind,
} from './logic';

/** Nodes per shape: five devices, and for the star a switch plus five. */
export const SIM_NODES: Record<TopologyKind, number> = {
  bus: 5,
  star: 6,
  ring: 5,
  mesh: 5,
};

export const SHAPE_NAME: Record<TopologyKind, string> = {
  bus: 'bus',
  star: 'star',
  ring: 'ring',
  mesh: 'mesh',
};

const TOPOLOGIES: Record<TopologyKind, Topology> = {
  bus: makeTopology('bus', SIM_NODES.bus),
  star: makeTopology('star', SIM_NODES.star),
  ring: makeTopology('ring', SIM_NODES.ring),
  mesh: makeTopology('mesh', SIM_NODES.mesh),
};

/** The fixed topology the simulation and the try-it draw for a shape. */
export function topologyOf(kind: TopologyKind): Topology {
  return TOPOLOGIES[kind];
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;
}

/** "A, B and D can still talk (3 of 5 devices)." and its two special cases. */
export function statusSentence(t: Topology, ok: string[]): string {
  if (ok.length === 0) return 'No device can talk to another.';
  if (ok.length === t.nodes.length) {
    return `All ${String(ok.length)} devices can talk to each other.`;
  }
  const names = ok.map((id) => nodeLabel(t, id));
  return `${joinList(names)} can still talk (${String(ok.length)} of ${String(t.nodes.length)} devices).`;
}

/** What the picture shows, in words, for its accessible name. */
export function sceneDescription(
  t: Topology,
  broken: Broken,
  ok: string[],
): string {
  const parts = [
    ...broken.links.map((id) => `The cable ${linkLabel(t, id)} is cut.`),
    ...broken.nodes.map((id) => `Device ${nodeLabel(t, id)} is down.`),
  ];
  const state = parts.length === 0 ? 'Nothing is broken.' : parts.join(' ');
  const hub = t.kind === 'star' ? ' with a switch in the middle' : '';
  return `Diagram of a ${SHAPE_NAME[t.kind]} network of ${String(t.nodes.length)} devices${hub}. ${state} ${statusSentence(t, ok)}`;
}

export type TopologyStep = {
  kind: TopologyKind;
  broken: Broken;
  caption: string;
  /** The devices that can still talk, from `communicatingNodes`. */
  ok: string[];
};

function step(kind: TopologyKind, broken: Broken, story: string): TopologyStep {
  const t = TOPOLOGIES[kind];
  const ok = communicatingNodes(t, broken);
  return { kind, broken, ok, caption: `${story} ${statusSentence(t, ok)}` };
}

const fine: Broken = { links: [], nodes: [] };

export const TOPOLOGY_STEPS: TopologyStep[] = [
  step(
    'bus',
    fine,
    'Bus: five devices tap into one shared backbone cable. Every message travels along that one cable.',
  ),
  step(
    'bus',
    { links: ['n1-n2'], nodes: [] },
    'The backbone is cut between B and C. In our model a cut backbone stops the whole bus: the signal bounces back off the open end and spoils every message.',
  ),
  step(
    'bus',
    { links: [], nodes: ['n2'] },
    'Device C fails. The backbone is still whole, so the others carry on without C.',
  ),
  step(
    'star',
    fine,
    'Star: five devices each have their own cable to a switch in the middle. Every message goes through the switch.',
  ),
  step(
    'star',
    { links: ['n0-n3'], nodes: [] },
    'The cable from the switch to C is cut. Only C loses its connection. The other cables are untouched.',
  ),
  step(
    'star',
    { links: [], nodes: ['n0'] },
    'The switch fails. Every cable leads to it and every message goes through it, so nobody can talk. The switch is the single point of failure.',
  ),
  step(
    'ring',
    fine,
    'Ring: five devices are joined in a closed loop. Each one has two neighbours and passes messages along the loop.',
  ),
  step(
    'ring',
    { links: ['n1-n2'], nodes: [] },
    'One link in the loop is cut, between B and C. In a single ring, messages must go neighbour to neighbour all the way round, so one break stops everyone.',
  ),
  step(
    'ring',
    { links: [], nodes: ['n2'] },
    'Device C fails. It was passing messages along the loop, so in a single ring the loop is broken and nobody can talk.',
  ),
  step(
    'mesh',
    fine,
    'Full mesh: every device has its own cable to every other device. Five devices need 10 cables.',
  ),
  step(
    'mesh',
    { links: ['n0-n1', 'n0-n2'], nodes: [] },
    'Two cables are cut: A to B and A to C. A still reaches them by going through D or E, because traffic can take another route.',
  ),
  step(
    'mesh',
    { links: ['n0-n1', 'n0-n2', 'n0-n3', 'n0-n4'], nodes: [] },
    'All four of A’s cables are cut. A has no route out, so A is cut off. B, C, D and E still have cables between them.',
  ),
];
