// Goals of the lab "Build your first network". Pure TypeScript: no React.
// Ping-based goals use the shared `canPing`, which demands a real path between
// two different devices, never `ping` alone.

import { canPing, type LabTask } from '@/labs/labTasks';
import { parseIPv4, parseMask, sameSubnet } from '@/netcore/ipv4';
import type { Device, Network } from '@/netcore/network';

function devicesOf(net: Network): Device[] {
  const devices: unknown = (net as Network | undefined)?.devices;
  return Array.isArray(devices) ? (devices as Device[]) : [];
}

function linksOf(net: Network): Network['links'] {
  const links: unknown = (net as Network | undefined)?.links;
  return Array.isArray(links) ? (links as Network['links']) : [];
}

/** True when some switch has at least two different computers cabled to it. */
export function pcsShareASwitch(net: Network): boolean {
  const devices = devicesOf(net);
  const pcIds = new Set(
    devices.filter((d) => d.kind === 'pc').map((d) => d.id),
  );
  const links = linksOf(net);
  return devices
    .filter((d) => d.kind === 'switch')
    .some((s) => {
      const pcs = new Set<string>();
      for (const l of links) {
        const other = l.a === s.id ? l.b : l.b === s.id ? l.a : undefined;
        if (other !== undefined && pcIds.has(other)) pcs.add(other);
      }
      return pcs.size >= 2;
    });
}

/**
 * True when two computers have valid, DIFFERENT addresses and valid masks, and
 * each computer's own mask puts both addresses in the same subnet.
 */
export function pcsShareASubnet(net: Network): boolean {
  const configs = devicesOf(net)
    .filter((d) => d.kind === 'pc')
    .map((d) => ({ ip: parseIPv4(d.ip ?? ''), mask: parseMask(d.mask ?? '') }))
    .filter(
      (c): c is { ip: number; mask: number } =>
        c.ip !== null && c.mask !== null,
    );
  return configs.some((a, i) =>
    configs
      .slice(i + 1)
      .some(
        (b) =>
          a.ip !== b.ip &&
          sameSubnet(a.ip, b.ip, a.mask) &&
          sameSubnet(a.ip, b.ip, b.mask),
      ),
  );
}

export const firstNetworkTasks: LabTask[] = [
  {
    id: 'two-pcs-on-a-switch',
    description: 'Two computers are connected through a switch',
    check: pcsShareASwitch,
  },
  {
    id: 'same-subnet',
    description: 'Both computers have their own addresses in the same subnet',
    check: pcsShareASubnet,
  },
  {
    id: 'pc1-pings-pc2',
    description: 'PC1 can ping PC2',
    check: (net) => canPing(net, 'PC1', 'PC2'),
  },
];
