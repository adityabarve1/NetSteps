import type { LevelMeta } from '../types.ts';

export const level7: LevelMeta = {
  id: 'level-7',
  number: 7,
  title: 'Security and modern networks',
  summary:
    'Learn how networks are protected, how encryption keeps data private, how common attacks work in safe simulations, and how Wi-Fi, 5G and the cloud fit in. Finish by building a network of your own.',
  lessons: [
    {
      id: 'l7-firewalls-acls',
      levelId: 'level-7',
      title: 'Firewalls and ACLs',
      summary:
        'Write simple rules that allow or block traffic, then test what a firewall does with each packet.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-encryption-basics',
      levelId: 'level-7',
      title: 'Encryption basics',
      summary:
        'Learn how a key keeps data private, and how two computers that have never met can agree on a secret key over an open network.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-tls-handshake',
      levelId: 'level-7',
      title: 'TLS handshake',
      summary:
        'Watch a browser and a website agree on how to protect their conversation and prove who they are before any page is sent.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-vpns',
      levelId: 'level-7',
      title: 'VPNs',
      summary:
        'See how a VPN wraps your traffic in an encrypted tunnel to another network, and what it does and does not protect.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-common-attacks',
      levelId: 'level-7',
      title: 'Common attacks (ARP spoofing, DoS, MITM, DNS poisoning)',
      summary:
        'Watch four common attacks play out in a safe simulation, and learn how each one works and how networks defend against it.',
      minutes: 22,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-wifi-5g',
      levelId: 'level-7',
      title: 'Wi-Fi and 5G',
      summary:
        'Learn how wireless networks send data through the air, how Wi-Fi and 5G differ, and what keeps a wireless connection secure.',
      minutes: 16,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-sdn-cloud',
      levelId: 'level-7',
      title: 'SDN and cloud',
      summary:
        'See how software can control a whole network from one place, and how the cloud lets you rent networks and servers on demand.',
      minutes: 16,
      built: false,
      labIds: [],
    },
    {
      id: 'l7-final-sandbox',
      levelId: 'level-7',
      title: 'Final "build your own network" sandbox',
      summary:
        'Put it all together: design and build a company network from a written brief, and have it checked automatically.',
      minutes: 30,
      built: false,
      labIds: [],
    },
  ],
};
