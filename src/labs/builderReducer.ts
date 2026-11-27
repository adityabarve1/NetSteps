// The network builder's state logic. Pure TypeScript: no React, no clock, no
// randomness. Every action returns a new `Network`, or the SAME object when it
// changes nothing, so React can skip the render. It never throws and never
// mutates its input, even for hostile values.
//
// Rules worth knowing:
// - Duplicate device ids (only possible in a hand-made network): the FIRST
//   device with an id wins, exactly like `ping`. `normalizeNetwork` repairs a
//   network before the builder starts with it.
// - `setConfig` stores the typed strings untouched (no trimming; `ping` does
//   the validating). An EMPTY string means "not set" and removes the field.
//   Switches have no address, so `setConfig` on a switch is ignored. A value
//   that is not a string (possible only at runtime) ignores the whole action.

import type { Device, DeviceKind, Link, Network } from '@/netcore/network';

export type BuilderAction =
  | { type: 'addDevice'; kind: DeviceKind; x: number; y: number }
  | { type: 'removeDevice'; id: string }
  | { type: 'connect'; a: string; b: string }
  | { type: 'disconnect'; linkId: string }
  | {
      type: 'setConfig';
      id: string;
      ip: string;
      mask: string;
      gateway?: string;
    }
  | { type: 'moveDevice'; id: string; x: number; y: number };

/** Canvas size and the box a device centre may sit in (the icon and its label hang around the centre). */
export const CANVAS = {
  width: 480,
  height: 340,
  minX: 52,
  maxX: 428,
  minY: 36,
  maxY: 280,
} as const;
export const MAX_DEVICES = 12;
export const MAX_SWITCH_LINKS = 8;
export const DEVICE_KINDS: readonly DeviceKind[] = ['pc', 'server', 'switch'];

const NAME_PREFIX: Record<DeviceKind, string> = {
  pc: 'PC',
  server: 'Server',
  switch: 'Switch',
};

export function isDeviceKind(value: unknown): value is DeviceKind {
  return DEVICE_KINDS.some((k) => k === value);
}

function clamp(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

/** Clamp a point into the canvas. NaN goes to the top-left limit. */
export function clampPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: clamp(x, CANVAS.minX, CANVAS.maxX),
    y: clamp(y, CANVAS.minY, CANVAS.maxY),
  };
}

function findDevice(net: Network, id: string): Device | undefined {
  return net.devices.find((d) => d.id === id);
}

function linkLimit(kind: DeviceKind): number {
  return kind === 'switch' ? MAX_SWITCH_LINKS : 1;
}

function linkCount(links: Link[], id: string): number {
  return links.filter((l) => l.a === id || l.b === id).length;
}

export type ConnectCheck =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'same-device'
        | 'unknown-device'
        | 'already-linked'
        | 'a-full'
        | 'b-full';
    };

/** Whether a cable from `a` to `b` is allowed, and if not, why. */
export function canConnect(net: Network, a: string, b: string): ConnectCheck {
  if (a === b) return { ok: false, reason: 'same-device' };
  const from = findDevice(net, a);
  const to = findDevice(net, b);
  if (from === undefined || to === undefined) {
    return { ok: false, reason: 'unknown-device' };
  }
  if (
    net.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))
  ) {
    return { ok: false, reason: 'already-linked' };
  }
  if (linkCount(net.links, a) >= linkLimit(from.kind)) {
    return { ok: false, reason: 'a-full' };
  }
  if (linkCount(net.links, b) >= linkLimit(to.kind)) {
    return { ok: false, reason: 'b-full' };
  }
  return { ok: true };
}

// Starting spots on a 4 x 3 grid (a device box is about 100px wide and tall, so
// the grid cannot be tighter), taken in an order chosen so that the first six
// devices are never in a straight line: a cable between any two of them never
// runs behind a third. Filling the grid row by row put PC1, PC2 and PC3 side by
// side, with the PC1 to PC3 cable hidden behind PC2.
const SLOTS: readonly { x: number; y: number }[] = [
  { x: 60, y: 50 },
  { x: 180, y: 50 },
  { x: 60, y: 150 },
  { x: 300, y: 150 },
  { x: 180, y: 250 },
  { x: 300, y: 250 },
  { x: 300, y: 50 },
  { x: 60, y: 250 },
  { x: 180, y: 150 },
  { x: 420, y: 150 },
  { x: 420, y: 50 },
  { x: 420, y: 250 },
];
const SLOT_CLEARANCE = 40;

/** The first starting spot with no device close by, so new devices never pile up. */
export function nextFreePosition(net: Network): { x: number; y: number } {
  for (const { x, y } of SLOTS) {
    const taken = net.devices.some(
      (d) => Math.hypot(d.x - x, d.y - y) < SLOT_CLEARANCE,
    );
    if (!taken) return { x, y };
  }
  return SLOTS[0] ?? { x: CANVAS.minX, y: CANVAS.minY };
}

function uniqueNumber(net: Network, kind: DeviceKind): number {
  const prefix = NAME_PREFIX[kind];
  const used = new Set<string>();
  for (const d of net.devices) {
    used.add(d.id.toLowerCase());
    used.add(d.name.toLowerCase());
  }
  let n = 1;
  while (
    used.has(`${kind}${String(n)}`) ||
    used.has(`${prefix}${String(n)}`.toLowerCase())
  ) {
    n += 1;
  }
  return n;
}

function uniqueLinkId(net: Network): string {
  const used = new Set(net.links.map((l) => l.id));
  let n = 1;
  while (used.has(`link${String(n)}`)) n += 1;
  return `link${String(n)}`;
}

function addDevice(
  net: Network,
  kind: DeviceKind,
  x: number,
  y: number,
): Network {
  if (!isDeviceKind(kind) || net.devices.length >= MAX_DEVICES) return net;
  const n = uniqueNumber(net, kind);
  const device: Device = {
    id: `${kind}${String(n)}`,
    kind,
    name: `${NAME_PREFIX[kind]}${String(n)}`,
    ...clampPosition(x, y),
  };
  return { ...net, devices: [...net.devices, device] };
}

function setConfig(
  net: Network,
  action: Extract<BuilderAction, { type: 'setConfig' }>,
): Network {
  const device = findDevice(net, action.id);
  if (device === undefined || device.kind === 'switch') return net;
  // Typed as strings, but a lab author or a stale caller can still hand over
  // anything at runtime. Ignore the whole change rather than store it.
  const values: unknown[] = [action.ip, action.mask, action.gateway];
  if (values.some((v) => v !== undefined && typeof v !== 'string')) return net;
  const ip = action.ip === '' ? undefined : action.ip;
  const mask = action.mask === '' ? undefined : action.mask;
  const gateway = action.gateway === '' ? undefined : action.gateway;
  if (device.ip === ip && device.mask === mask && device.gateway === gateway) {
    return net;
  }
  const next: Device = { ...device };
  delete next.ip;
  delete next.mask;
  delete next.gateway;
  if (ip !== undefined) next.ip = ip;
  if (mask !== undefined) next.mask = mask;
  if (gateway !== undefined) next.gateway = gateway;
  return {
    ...net,
    devices: net.devices.map((d) => (d === device ? next : d)),
  };
}

function moveDevice(net: Network, id: string, x: number, y: number): Network {
  const device = findDevice(net, id);
  if (device === undefined) return net;
  const to = clampPosition(x, y);
  if (device.x === to.x && device.y === to.y) return net;
  return {
    ...net,
    devices: net.devices.map((d) => (d === device ? { ...d, ...to } : d)),
  };
}

export function builderReducer(net: Network, action: BuilderAction): Network {
  switch (action.type) {
    case 'addDevice':
      return addDevice(net, action.kind, action.x, action.y);
    case 'removeDevice': {
      if (!net.devices.some((d) => d.id === action.id)) return net;
      return {
        devices: net.devices.filter((d) => d.id !== action.id),
        links: net.links.filter((l) => l.a !== action.id && l.b !== action.id),
      };
    }
    case 'connect': {
      if (!canConnect(net, action.a, action.b).ok) return net;
      const link = { id: uniqueLinkId(net), a: action.a, b: action.b };
      return { ...net, links: [...net.links, link] };
    }
    case 'disconnect':
      if (!net.links.some((l) => l.id === action.linkId)) return net;
      return {
        ...net,
        links: net.links.filter((l) => l.id !== action.linkId),
      };
    case 'setConfig':
      return setConfig(net, action);
    case 'moveDevice':
      return moveDevice(net, action.id, action.x, action.y);
    default:
      return net;
  }
}

/**
 * Repair a hand-made network before the builder starts with it: keep the first
 * device for each id, drop unknown kinds, cap the device count, clamp
 * positions, and keep only links that are valid and within the per-device
 * cable limits. Names are left alone (lessons look devices up by name). A
 * network that is already clean comes back equal.
 */
export function normalizeNetwork(input: Network): Network {
  const raw: unknown = input;
  const rawDevices: unknown[] =
    isRecord(raw) && Array.isArray(raw.devices) ? raw.devices : [];
  const rawLinks: unknown[] =
    isRecord(raw) && Array.isArray(raw.links) ? raw.links : [];
  const seen = new Set<string>();
  const devices: Device[] = [];
  for (const d of rawDevices) {
    if (devices.length >= MAX_DEVICES) break;
    if (!isRecord(d) || typeof d.id !== 'string' || seen.has(d.id)) continue;
    if (!isDeviceKind(d.kind)) continue;
    seen.add(d.id);
    const device: Device = {
      id: d.id,
      kind: d.kind,
      name: typeof d.name === 'string' ? d.name : d.id,
      ...clampPosition(Number(d.x), Number(d.y)),
    };
    if (typeof d.ip === 'string') device.ip = d.ip;
    if (typeof d.mask === 'string') device.mask = d.mask;
    if (typeof d.gateway === 'string') device.gateway = d.gateway;
    devices.push(device);
  }
  let net: Network = { devices, links: [] };
  const linkIds = new Set<string>();
  for (const l of rawLinks) {
    if (!isRecord(l) || typeof l.id !== 'string' || linkIds.has(l.id)) continue;
    if (typeof l.a !== 'string' || typeof l.b !== 'string') continue;
    if (!canConnect(net, l.a, l.b).ok) continue;
    linkIds.add(l.id);
    net = { ...net, links: [...net.links, { id: l.id, a: l.a, b: l.b }] };
  }
  return net;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
