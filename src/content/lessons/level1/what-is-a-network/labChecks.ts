// Goals of the lab "Build your first network". Pure TypeScript: no React.
//
// All three goals are about the SAME two computers, PC1 and PC2, found by name
// (ignoring case, like `canPing`), so the lab instructions and the checks
// agree and a distraction elsewhere on the canvas cannot tick a goal. The
// ping goal uses the shared `canPing` (a real path between two different
// devices), never a raw `ping`.

import { canPing, type LabTask } from '@/labs/labTasks';
import { parseIPv4, parseMask, sameSubnet } from '@/netcore/ipv4';
import type { Device, Network } from '@/netcore/network';

const FROM = 'PC1';
const TO = 'PC2';

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
 * Goal 1: PC1 and PC2 are joined through at least one switch. Every device
 * between them must be a switch, so a chain of switches counts, but a direct
 * cable or another computer in the middle does not.
 */
export function pcsLinkedThroughSwitch(net: Network): boolean {
  const from = named(net, FROM);
  const to = named(net, TO);
  if (from === undefined || to === undefined || from.id === to.id) return false;
  const kind = new Map(devicesOf(net).map((d) => [d.id, d.kind]));
  const neighbours = (id: string): string[] =>
    linksOf(net).flatMap((l) => (l.a === id ? [l.b] : l.b === id ? [l.a] : []));

  // Breadth-first search over switches only, starting at PC1's switches.
  const seen = new Set<string>();
  const queue = neighbours(from.id).filter((id) => kind.get(id) === 'switch');
  for (const id of queue) {
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of neighbours(id)) {
      if (next === to.id) return true;
      if (kind.get(next) === 'switch' && !seen.has(next)) queue.push(next);
    }
  }
  return false;
}

/**
 * Goal 2: PC1 and PC2 have valid, DIFFERENT addresses and valid masks, and
 * each computer's own mask puts both addresses in the same subnet.
 */
export function pcsShareASubnet(net: Network): boolean {
  const config = (d: Device | undefined) => ({
    ip: parseIPv4(d?.ip ?? ''),
    mask: parseMask(d?.mask ?? ''),
  });
  const a = config(named(net, FROM));
  const b = config(named(net, TO));
  if (a.ip === null || a.mask === null || b.ip === null || b.mask === null) {
    return false;
  }
  return (
    a.ip !== b.ip &&
    sameSubnet(a.ip, b.ip, a.mask) &&
    sameSubnet(a.ip, b.ip, b.mask)
  );
}

export const firstNetworkTasks: LabTask[] = [
  {
    id: 'pcs-through-a-switch',
    description: 'PC1 and PC2 are connected through a switch',
    check: pcsLinkedThroughSwitch,
  },
  {
    id: 'same-subnet',
    description: 'PC1 and PC2 have their own addresses in the same subnet',
    check: pcsShareASubnet,
  },
  {
    id: 'pcs-can-ping',
    description: 'PC1 and PC2 can ping each other',
    check: (net) => canPing(net, FROM, TO) && canPing(net, TO, FROM),
  },
];
