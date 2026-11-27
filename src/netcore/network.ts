// The simulated network model and `ping`. Pure TypeScript: no React, no clock,
// no randomness and no I/O. It only reads the in-memory `Network` it is given.

import { parseIPv4, parseMask, sameSubnet } from './ipv4';

export type DeviceKind = 'pc' | 'server' | 'switch';

export type Device = {
  id: string;
  kind: DeviceKind;
  name: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  x: number;
  y: number;
};

export type Link = { id: string; a: string; b: string };

export type Network = { devices: Device[]; links: Link[] };

export type PingFailure =
  'unknown-host' | 'no-ip-config' | 'different-network' | 'no-path';

export type PingResult = {
  ok: boolean;
  failure?: PingFailure;
  path: string[];
  rttMs: number;
};

function fail(failure: PingFailure): PingResult {
  return { ok: false, failure, path: [], rttMs: 0 };
}

/**
 * Index devices by id. When two devices share an id the FIRST one wins and
 * the later ones are ignored entirely (they cannot be cabled or pinged).
 */
function indexDevices(devices: Device[]): Map<string, Device> {
  const byId = new Map<string, Device>();
  for (const d of devices) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return byId;
}

/**
 * Neighbour lists in link order. Self-links and links naming an unknown
 * device are skipped; duplicate links just repeat a neighbour, which the
 * visited set in the search absorbs.
 */
function buildAdjacency(
  links: Link[],
  byId: Map<string, Device>,
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const add = (from: string, to: string): void => {
    const list = adjacency.get(from);
    if (list === undefined) adjacency.set(from, [to]);
    else list.push(to);
  };
  for (const l of links) {
    if (l.a === l.b || !byId.has(l.a) || !byId.has(l.b)) continue;
    add(l.a, l.b);
    add(l.b, l.a);
  }
  return adjacency;
}

/**
 * Breadth-first search from `sourceId`. Only the source and `switch` devices
 * are expanded, so a pc or server can be reached (as an endpoint) but never
 * forwards. Iterative, so a very long chain cannot overflow the stack.
 * Returns each reached device's distance (in links) and its parent.
 */
function search(
  sourceId: string,
  adjacency: Map<string, string[]>,
  byId: Map<string, Device>,
): { distance: Map<string, number>; parent: Map<string, string> } {
  const distance = new Map<string, number>([[sourceId, 0]]);
  const parent = new Map<string, string>();
  const queue: string[] = [sourceId];
  // Appending while iterating is deliberate: it makes this a FIFO queue.
  for (const current of queue) {
    const isSource = current === sourceId;
    if (!isSource && byId.get(current)?.kind !== 'switch') continue;
    const here = distance.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, here + 1);
      parent.set(next, current);
      queue.push(next);
    }
  }
  return { distance, parent };
}

function pathTo(
  sourceId: string,
  targetId: string,
  parent: Map<string, string>,
): string[] {
  const path = [targetId];
  let current = targetId;
  while (current !== sourceId) {
    const previous = parent.get(current);
    if (previous === undefined) break; // unreachable: callers only pass reached ids
    path.push(previous);
    current = previous;
  }
  return path.reverse();
}

/**
 * Ping `target` (a dotted-quad string) from the device `fromId`.
 *
 * Decision order (each step is pinned by a test):
 *  a. `target` must pass `parseIPv4` exactly (no trimming; the terminal trims
 *     before calling), else `unknown-host`.
 *  b. The source must exist and have a valid `ip` and `mask`, else
 *     `no-ip-config`. An unknown `fromId` also gives `no-ip-config` with
 *     `path: []`; it never throws.
 *  c. The owner is a device whose `ip` parses to the target (the source
 *     counts). No owner at all gives `unknown-host`, even if the target is
 *     on another subnet.
 *  d. Self-ping: a target equal to the source's own address succeeds with
 *     `path: [fromId]` and `rttMs: 0`, before the subnet and path steps,
 *     even if another device shares that IP.
 *  e. `sameSubnet(source ip, target ip, SOURCE's mask)`; false gives
 *     `different-network`. Only the source's mask is used (asymmetric masks
 *     are realistic and the target's mask may be missing). There are no
 *     routers in this phase, so `gateway` is ignored.
 *  f. Shortest path by breadth-first search over `links`, where only
 *     `switch` devices may be intermediate nodes; none gives `no-path`.
 *     `rttMs` is the number of links (path length minus one).
 *
 * If several devices own the target IP, the one reachable by the shortest
 * path is chosen, ties broken by array order; if none is reachable the
 * result is `no-path`. Duplicate device ids: the first device with an id wins.
 */
export function ping(net: Network, fromId: string, target: string): PingResult {
  const targetIp = parseIPv4(target);
  if (targetIp === null) return fail('unknown-host');

  const byId = indexDevices(net.devices);
  const source = byId.get(fromId);
  const sourceIp = parseIPv4(source?.ip ?? '');
  const sourceMask = parseMask(source?.mask ?? '');
  if (source === undefined || sourceIp === null || sourceMask === null) {
    return fail('no-ip-config');
  }

  const owners: string[] = [];
  for (const d of byId.values()) {
    if (parseIPv4(d.ip ?? '') === targetIp) {
      owners.push(d.id);
    }
  }
  if (owners.length === 0) return fail('unknown-host');

  if (sourceIp === targetIp) return { ok: true, path: [fromId], rttMs: 0 };

  if (!sameSubnet(sourceIp, targetIp, sourceMask)) {
    return fail('different-network');
  }

  const { distance, parent } = search(
    fromId,
    buildAdjacency(net.links, byId),
    byId,
  );
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const id of owners) {
    const d = distance.get(id);
    if (d !== undefined && d < bestDistance) {
      best = id;
      bestDistance = d;
    }
  }
  if (best === undefined) return fail('no-path');

  const path = pathTo(fromId, best, parent);
  return { ok: true, path, rttMs: path.length - 1 };
}
