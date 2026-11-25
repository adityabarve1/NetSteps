// A small lab network shared by the terminal tests. Not imported by app code.
import type { Network } from './network';
import { device, link, net, pc, server, sw } from './network.fixtures';

/**
 * - pc1 (192.168.1.10, dotted mask, gateway) - sw1 - pc2 (.20), srv1 (.30),
 *   far (10.0.0.5, another network) and blank (no IP configuration)
 * - island (192.168.1.40): same network as pc1 but cabled to nothing
 * - badmask (192.168.1.50): an address with a mask that is not a real mask
 * - c1 - sw3 - sw4 - c2 (172.16.0.x): three links apart
 * - d1 - d2 (172.17.0.x): one link apart
 */
export function labNet(): Network {
  return net(
    [
      device('pc1', 'pc', {
        ip: '192.168.1.10',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
      }),
      sw('sw1'),
      pc('pc2', '192.168.1.20'),
      server('srv1', '192.168.1.30'),
      pc('far', '10.0.0.5'),
      pc('island', '192.168.1.40'),
      pc('blank'),
      device('badmask', 'pc', { ip: '192.168.1.50', mask: '255.0.255.0' }),
      pc('c1', '172.16.0.1'),
      sw('sw3'),
      sw('sw4'),
      pc('c2', '172.16.0.2'),
      pc('d1', '172.17.0.1'),
      pc('d2', '172.17.0.2'),
    ],
    [
      link('pc1', 'sw1'),
      link('sw1', 'pc2'),
      link('sw1', 'srv1'),
      link('sw1', 'far'),
      link('sw1', 'blank'),
      link('c1', 'sw3'),
      link('sw3', 'sw4'),
      link('sw4', 'c2'),
      link('d1', 'd2'),
    ],
  );
}

export const lines4 = (line: string): string[] => [line, line, line, line];
