// Plain-English labels and messages for the network builder. Pure TypeScript.

import { parseIPv4 } from '@/netcore/ipv4';
import type { Device, DeviceKind } from '@/netcore/network';
import {
  DEVICE_KINDS,
  isDeviceKind,
  type ConnectCheck,
} from './builderReducer';

export const KIND_NAME: Record<DeviceKind, string> = {
  pc: 'computer',
  server: 'server',
  switch: 'switch',
};

export const ADD_LABEL: Record<DeviceKind, string> = {
  pc: 'Add a computer',
  server: 'Add a server',
  switch: 'Add a switch',
};

/** Known kinds only, each once, in the builder's fixed order. */
export function sanitizePalette(palette: readonly unknown[]): DeviceKind[] {
  const wanted = Array.isArray(palette) ? palette.filter(isDeviceKind) : [];
  return DEVICE_KINDS.filter((kind) => wanted.includes(kind));
}

/** Accessible name of a device on the canvas, for example "PC1, computer, IP 192.168.1.10". */
export function deviceLabel(d: Device): string {
  const base = `${d.name}, ${KIND_NAME[d.kind]}`;
  if (d.kind === 'switch') return base;
  const ip = d.ip ?? '';
  if (ip === '') return `${base}, no IP yet`;
  return parseIPv4(ip) === null
    ? `${base}, IP not valid yet`
    : `${base}, IP ${ip}`;
}

/** The short address line drawn under a device name ("" for a switch). */
export function addressLine(d: Device): string {
  if (d.kind === 'switch') return '';
  const ip = d.ip ?? '';
  if (ip === '') return 'no IP yet';
  return parseIPv4(ip) === null ? 'IP not valid' : ip;
}

/** What to tell the learner after a connect attempt. */
export function connectMessage(
  check: ConnectCheck,
  from: string,
  to: string,
): string {
  if (check.ok) return `Connected ${from} to ${to}.`;
  switch (check.reason) {
    case 'already-linked':
      return `${from} and ${to} already have a cable between them.`;
    case 'a-full':
      return `${from} cannot take another cable. Remove its cable first, or pick a different device.`;
    case 'b-full':
      return `${to} cannot take another cable. Remove its cable first, or pick a different device.`;
    case 'same-device':
      return 'A cable needs two different devices.';
    default:
      return 'That device is no longer on the canvas.';
  }
}
