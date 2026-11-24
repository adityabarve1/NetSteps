import type { LevelMeta } from '../types.ts';

export const level4: LevelMeta = {
  id: 'level-4',
  number: 4,
  title: 'Routing',
  summary:
    'Learn how routers choose paths, from simple fixed routes to the protocols that run the internet, and how switches avoid loops and keep groups of devices apart.',
  lessons: [
    {
      id: 'l4-static-dynamic-routing',
      levelId: 'level-4',
      title: 'Static and dynamic routing',
      summary:
        'Compare routes you type in by hand with routes that routers learn and update on their own, and see what happens when a link fails.',
      minutes: 15,
      built: false,
      labIds: [],
    },
    {
      id: 'l4-rip',
      levelId: 'level-4',
      title: 'RIP (distance vector)',
      summary:
        'Watch routers share their routing tables with their neighbors and count hops until everyone agrees on the routes with the fewest hops.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l4-ospf',
      levelId: 'level-4',
      title: 'OSPF (link state)',
      summary:
        'See how each router builds a map of the whole network, then uses it to work out the cheapest path to every destination.',
      minutes: 20,
      built: false,
      labIds: [],
    },
    {
      id: 'l4-bgp',
      levelId: 'level-4',
      title: 'BGP and the internet',
      summary:
        'Learn how thousands of separate networks, called autonomous systems, tell each other which addresses they can reach, so the internet works as a whole.',
      minutes: 20,
      built: false,
      labIds: [],
    },
    {
      id: 'l4-spanning-tree',
      levelId: 'level-4',
      title: 'Spanning tree',
      summary:
        'See how switches turn off some links on purpose to stop a loop, and turn them back on if another link fails.',
      minutes: 16,
      built: false,
      labIds: [],
    },
    {
      id: 'l4-vlans',
      levelId: 'level-4',
      title: 'VLANs',
      summary:
        'Learn how one physical switch can be split into separate virtual networks, so groups of devices stay apart even when they share the same cables.',
      minutes: 16,
      built: false,
      labIds: [],
    },
  ],
};
