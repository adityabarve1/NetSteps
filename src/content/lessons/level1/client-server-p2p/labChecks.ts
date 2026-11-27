// Goals of the lab "A server and three computers". Pure TypeScript: no React.
//
// Every goal is about the lab's OWN devices, found by name (ignoring case, like
// `canPing`): PC1, PC2, PC3 and Server1. The instructions, the goal
// descriptions and these checks all use the same names, so a distraction
// elsewhere on the canvas cannot tick a goal. The ping goal uses the shared
// `canPing` (a real path between two different devices), never a raw `ping`.

import { canPing, type LabTask } from '@/labs/labTasks';
import { parseIPv4 } from '@/netcore/ipv4';
import type { Device, Network } from '@/netcore/network';

export const COMPUTERS = ['PC1', 'PC2', 'PC3'] as const;
export const SERVER = 'Server1';

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
 * Goal 1: PC1, PC2, PC3 and Server1 are all cabled to the SAME switch (one
 * switch with a direct cable to each of the four). A chain of switches, a
 * direct cable between two of them, or other devices on the switch do not
 * count on their own.
 */
export function allOnOneSwitch(net: Network): boolean {
  const wanted = [...COMPUTERS, SERVER].map((n) => named(net, n));
  const ids: string[] = [];
  for (const d of wanted) {
    if (d === undefined) return false;
    ids.push(d.id);
  }
  return devicesOf(net)
    .filter((d) => d.kind === 'switch')
    .some((sw) =>
      ids.every((id) =>
        linksOf(net).some(
          (l) => (l.a === sw.id && l.b === id) || (l.b === sw.id && l.a === id),
        ),
      ),
    );
}

/**
 * Goal 2: PC1, PC2, PC3 and Server1 each have a valid address of their own (no
 * two the same), and PC1, PC2 and PC3 can each ping Server1 over a real path.
 */
export function everyComputerReachesServer(net: Network): boolean {
  const addresses = [...COMPUTERS, SERVER].map((n) =>
    parseIPv4(named(net, n)?.ip ?? ''),
  );
  if (new Set(addresses).size !== addresses.length) return false;
  return COMPUTERS.every((pc) => canPing(net, pc, SERVER));
}

export const serverLabTasks: LabTask[] = [
  {
    id: 'all-on-one-switch',
    description:
      'PC1, PC2, PC3 and Server1 are all connected to the same switch',
    check: allOnOneSwitch,
  },
  {
    id: 'every-pc-pings-server',
    description:
      'PC1, PC2, PC3 and Server1 have their own addresses, and each computer can ping Server1',
    check: everyComputerReachesServer,
  },
];
