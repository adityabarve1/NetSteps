// Small builders shared by the netcore tests. Not imported by app code.
import type { Device, DeviceKind, Link, Network } from './network';

export function device(
  id: string,
  kind: DeviceKind,
  config: { ip?: string; mask?: string; gateway?: string } = {},
): Device {
  return { id, kind, name: id.toUpperCase(), x: 0, y: 0, ...config };
}

export function pc(id: string, ip?: string, mask = '/24'): Device {
  return ip === undefined ? device(id, 'pc') : device(id, 'pc', { ip, mask });
}

export function server(id: string, ip?: string, mask = '/24'): Device {
  return ip === undefined
    ? device(id, 'server')
    : device(id, 'server', { ip, mask });
}

export function sw(id: string): Device {
  return device(id, 'switch');
}

export function link(a: string, b: string, id = `${a}~${b}`): Link {
  return { id, a, b };
}

export function net(devices: Device[], links: Link[]): Network {
  return { devices, links };
}

/** pc1 (192.168.1.10) - sw1 - pc2 (192.168.1.20), all /24. */
export function simpleLan(): Network {
  return net(
    [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.1.20')],
    [link('pc1', 'sw1'), link('sw1', 'pc2')],
  );
}
