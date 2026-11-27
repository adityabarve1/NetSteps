import type { LevelMeta } from '../types.ts';

export const level2: LevelMeta = {
  id: 'level-2',
  number: 2,
  title: 'Layers and the local network',
  summary:
    'Learn how network software is split into layers, how data is wrapped for its trip, and how devices on one local network find and talk to each other.',
  lessons: [
    {
      id: 'l2-osi-tcpip',
      levelId: 'level-2',
      title: 'OSI and TCP/IP',
      summary:
        'Watch a message travel down the layers of one computer and up the layers of another, and see why networks are built in layers.',
      minutes: 15,
      built: false,
      labIds: [],
    },
    {
      id: 'l2-encapsulation',
      levelId: 'level-2',
      title: 'Encapsulation and headers',
      summary:
        'See how each layer wraps your data in its own label, called a header, and how the receiver removes the labels one by one.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l2-ethernet-and-mac-addresses',
      levelId: 'level-2',
      title: 'Ethernet and MAC addresses',
      summary:
        'Learn how devices on the same local network are identified by their MAC addresses, and how Ethernet frames carry data between them.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l2-switches',
      levelId: 'level-2',
      title: 'Switches',
      summary:
        'Watch a switch learn which device is plugged into which port, and see how that lets it send data only where it needs to go.',
      minutes: 15,
      built: false,
      labIds: [],
    },
    {
      id: 'l2-arp',
      levelId: 'level-2',
      title: 'ARP',
      summary:
        'Watch a computer ask its local network "Who has this IP address?" and learn how it finds the MAC address it needs to send data.',
      minutes: 12,
      built: false,
      labIds: [],
    },
    {
      id: 'l2-error-detection',
      levelId: 'level-2',
      title: 'Error detection: parity, checksum, CRC',
      summary:
        'Flip a bit in a message and see how simple checks like parity, a checksum and a CRC can notice that the data was damaged.',
      minutes: 14,
      built: false,
      labIds: [],
    },
  ],
};
