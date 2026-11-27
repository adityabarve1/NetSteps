import type { LevelMeta } from '../types.ts';

export const level3: LevelMeta = {
  id: 'level-3',
  number: 3,
  title: 'IP addressing',
  summary:
    'Learn how devices get addresses, how addresses are split into networks, and how routers move data from one network to another.',
  lessons: [
    {
      id: 'l3-ipv4',
      levelId: 'level-3',
      title: 'IPv4',
      summary:
        'Learn how an IPv4 address is built from 32 bits, how we write it as four numbers, and the difference between public and private addresses.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-subnetting-cidr',
      levelId: 'level-3',
      title: 'Subnetting and CIDR',
      summary:
        'Slide the line between the network part and the host part of an address, and see how a prefix like /24 sets network size.',
      minutes: 25,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-vlsm',
      levelId: 'level-3',
      title: 'VLSM',
      summary:
        'Learn to give each subnet the size it needs, instead of making every subnet the same size, so addresses are not wasted.',
      minutes: 20,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-ipv6',
      levelId: 'level-3',
      title: 'IPv6',
      summary:
        'Learn why the world needed a new addressing system, how a 128-bit IPv6 address is written and shortened, and how it differs from IPv4.',
      minutes: 16,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-routers-routing-tables',
      levelId: 'level-3',
      title: 'Routers and routing tables',
      summary:
        'Follow a packet as each router looks up the destination in its routing table and picks the next router to send it to.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-nat',
      levelId: 'level-3',
      title: 'NAT',
      summary:
        'See how many devices at home can share one public address, and how your router keeps track of which reply belongs to which device.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-dhcp',
      levelId: 'level-3',
      title: 'DHCP',
      summary:
        'Watch a new device join a network and see how DHCP hands it an address, a mask and a gateway automatically.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l3-ping-traceroute',
      levelId: 'level-3',
      title: 'ping and traceroute',
      summary:
        'Use ping to check whether another device answers and how long it takes, and traceroute to see the routers along the way.',
      minutes: 16,
      built: false,
      labIds: [],
    },
  ],
};
