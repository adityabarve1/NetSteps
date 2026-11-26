// Goals of the lab "Build a star". Pure TypeScript: no React.
//
// Both goals are about the lab's OWN devices, found by the names the builder
// gives them: Switch1 and PC1 to PC4 (ignoring case, like `canPing`). So the
// lab text, the goal wording and the checks all agree, and a distraction
// elsewhere on the canvas cannot tick a goal. The ping goal uses the shared
// `canPing` (a real path between two different devices), never a raw `ping`.

import { canPing, type LabTask } from '@/labs/labTasks';
import type { Device, Network } from '@/netcore/network';

const HUB = 'Switch1';
const PCS = ['PC1', 'PC2', 'PC3', 'PC4'];

function devicesOf(net: Network): Device[] {
  const devices: unknown = (net as Network | undefined)?.devices;
  return Array.isArray(devices) ? (devices as Device[]) : [];
}

function linksOf(net: Network): Network['links'] {
  const links: unknown = (net as Network | undefined)?.links;
  return Array.isArray(links) ? (links as Network['links']) : [];
}

function named(net: Network, name: string): Device | undefined {
  const wanted = name.toLowerCase();
  return devicesOf(net).find(
    (d) => typeof d.name === 'string' && d.name.toLowerCase() === wanted,
  );
}

/**
 * Goal 1: a star. Switch1 is a switch, PC1 to PC4 are computers, and each of
 * the four has a cable to Switch1 and to nothing else.
 */
export function starIsBuilt(net: Network): boolean {
  const hub = named(net, HUB);
  if (hub?.kind !== 'switch') return false;
  const links = linksOf(net);
  return PCS.every((name) => {
    const pc = named(net, name);
    if (pc?.kind !== 'pc') return false;
    const mine = links.filter((l) => l.a === pc.id || l.b === pc.id);
    const only = mine[0];
    return (
      mine.length === 1 &&
      only !== undefined &&
      (only.a === hub.id || only.b === hub.id) &&
      only.a !== only.b
    );
  });
}

/** Goal 2: each of PC1 to PC4 can ping each of the other three. */
export function everyPcCanPingEveryOther(net: Network): boolean {
  if (devicesOf(net).length === 0) return false;
  return PCS.every((from) =>
    PCS.every((to) => from === to || canPing(net, from, to)),
  );
}

export const starTasks: LabTask[] = [
  {
    id: 'star-built',
    description:
      'PC1, PC2, PC3 and PC4 are each connected to Switch1, and to nothing else',
    check: starIsBuilt,
  },
  {
    id: 'every-pc-can-ping',
    description: 'Every computer can ping every other computer',
    check: everyPcCanPingEveryOther,
  },
];
