// The steps of the primary simulation. Pure TypeScript: no React. Routes come
// from `assignRoutes` and the circuit's fate from `circuitSurvives`, so the
// picture, the captions and the theory agree with logic.ts.

import { assignRoutes, circuitSurvives, splitIntoPackets } from './logic';

export type RouteName = 'A' | 'B';
export type CircuitView = 'none' | 'setup' | 'active' | 'dropped';

/** Route A goes through Router 1 (R1), route B through Router 2 (R2). */
export const ROUTE_A = ['S-R1', 'R1-D'];
export const ROUTE_B = ['S-R2', 'R2-D'];
/** The link that breaks: Router 1 to the friend's device. */
export const BROKEN_LINK = 'R1-D';
/** 5 packets of 1000 bytes and one of 500. */
export const MESSAGE_BYTES = 5500;
export const MAX_PAYLOAD = 1000;

export type PacketView = {
  seq: number;
  /** The route the packet is on, or null while it waits or after it arrived. */
  route: RouteName | null;
  /** 0 at the sender, 1 at the receiver. Along a route, 0.5 is the router. */
  progress: number;
  /** Place in the sender's or receiver's tray (used at progress 0 and 1). */
  slot: number;
};

export type SwitchStep = {
  packets: PacketView[];
  circuit: CircuitView;
  /** True once the link between Router 1 and the friend has broken. */
  broken: boolean;
  caption: string;
  /** Text alternative for the picture. */
  label: string;
};

// assignRoutes returns a copy of the route it chose, so match by first link.
const routeName = (route: string[] | null): RouteName | null => {
  if (route === null) return null;
  return route[0] === ROUTE_A[0] ? 'A' : 'B';
};

// Packets on the same route must not sit on the same spot, and must not hide a
// router (progress 0.5), so they take places from this list: the one in front
// goes furthest.
const SPOTS = [0.8, 0.66, 0.3, 0.12];

function onRoutes(
  seqs: number[],
  names: (RouteName | null)[],
  spots: number[] = SPOTS,
): PacketView[] {
  const used = { A: 0, B: 0 };
  return seqs.map((seq, i) => {
    const route = names[i] ?? null;
    if (route === null) return { seq, route, progress: 0, slot: seq - 1 };
    const behind = used[route];
    used[route] += 1;
    return { seq, route, progress: spots[behind] ?? 0.05, slot: seq - 1 };
  });
}

const waiting = (seqs: number[]): PacketView[] =>
  seqs.map((seq) => ({ seq, route: null, progress: 0, slot: seq - 1 }));

const arrivedInOrder = (seqs: number[]): PacketView[] =>
  seqs.map((seq) => ({ seq, route: null, progress: 1, slot: seq - 1 }));

const picture = (text: string) => `Diagram: ${text}`;

/** The ten steps of the simulation. */
export function switchingSteps(): SwitchStep[] {
  const seqs = splitIntoPackets(MESSAGE_BYTES, MAX_PAYLOAD).map((p) => p.seq);
  const routes = [ROUTE_A, ROUTE_B];
  const none = new Set<string>();
  const broken = new Set([BROKEN_LINK]);
  const first3 = assignRoutes(routes, 3, none).map(routeName);
  const all6 = assignRoutes(routes, seqs.length, none).map(routeName);
  const after = assignRoutes(routes, 3, broken).map(routeName);
  const droppedWords = circuitSurvives(ROUTE_A, broken)
    ? 'the call carries on'
    : 'the call drops';
  const arrivalOrder = [2, 1, 4, 3, 6, 5];
  const base = { circuit: 'none' as CircuitView, broken: false };

  return [
    {
      ...base,
      packets: waiting(seqs),
      caption: `You send a ${String(MESSAGE_BYTES)}-byte message to a friend. Your device cuts it into packets of at most ${String(MAX_PAYLOAD)} bytes: five of 1000 bytes and a last one of 500. It numbers them 1 to 6, so your friend’s device can put them back in order.`,
      label: picture(
        'your device, two routers and your friend’s device. Six numbered packets wait at your device. Nothing has been sent yet.',
      ),
    },
    {
      ...base,
      packets: [
        ...onRoutes([1, 2, 3], first3, [0.3, 0.12]),
        ...waiting([4, 5, 6]),
      ],
      caption:
        'The first three packets leave. Packets 1 and 3 take route A through Router 1. Packet 2 takes route B through Router 2. Each packet travels on its own, and no road is reserved for them. Packets 4, 5 and 6 wait their turn.',
      label: picture(
        'packets 1 and 3 are on route A through Router 1, packet 2 is on route B through Router 2, and packets 4, 5 and 6 still wait at your device.',
      ),
    },
    {
      ...base,
      packets: onRoutes(seqs, all6),
      caption:
        'All six are on their way, sharing both routes: odd numbers by route A, even numbers by route B. Real routers choose a route by their own rules, and they often keep one conversation on one road. This simulation alternates so you can see that packets are free to differ.',
      label: picture(
        'all six packets are travelling. Packets 1, 3 and 5 are on route A. Packets 2, 4 and 6 are on route B.',
      ),
    },
    {
      ...base,
      packets: arrivedInOrder(seqs).map((p) => ({
        ...p,
        slot: arrivalOrder.indexOf(p.seq),
      })),
      caption:
        'The packets arrive, but not in the order they were sent: 2, 1, 4, 3, 6, 5. Packet 2 came by a road that was a little quicker. Each packet carries its number, so the order it arrives in does not matter.',
      label: picture(
        'at your friend’s device the packets sit in arrival order: 2, 1, 4, 3, 6, 5.',
      ),
    },
    {
      ...base,
      packets: arrivedInOrder(seqs),
      caption:
        'Your friend’s device uses the numbers to put the packets in order, 1 to 6, and joins them into the original message. Nothing was reserved and nothing was set up first. If a packet were missing, the receiver would ask for that one again.',
      label: picture(
        'at your friend’s device the six packets are now in order, 1 to 6. The message is complete.',
      ),
    },
    {
      ...base,
      packets: [],
      circuit: 'setup',
      caption:
        'Now the same trip as a circuit-switched call. Before any data moves, the network picks route A and reserves capacity on every link of it for this call alone. That reserving is the setup, and it takes time.',
      label: picture(
        'route A through Router 1 is marked as reserved for one call. Route B is not used. No data has moved yet.',
      ),
    },
    {
      ...base,
      packets: [],
      circuit: 'active',
      caption:
        'The call is up. Data flows along the reserved route in a steady stream, in order, with no waiting at routers. Route B sits idle, and the call cannot use it. The reserved capacity is also idle whenever nobody speaks.',
      label: picture(
        'data flows along the reserved route A. Route B carries nothing.',
      ),
    },
    {
      ...base,
      packets: [],
      circuit: 'dropped',
      broken: true,
      caption: `The link between Router 1 and your friend breaks. The circuit used that link, so ${droppedWords}. A new circuit over route B would need a fresh setup, and whatever was said in between is lost.`,
      label: picture(
        'the link from Router 1 to your friend’s device is broken. The reserved route A uses it, so the call has dropped.',
      ),
    },
    {
      ...base,
      broken: true,
      packets: [...arrivedInOrder([1, 2, 3]), ...onRoutes([4, 5, 6], after)],
      caption:
        'Back to packets, with the same broken link. Packets 1, 2 and 3 had already arrived. Packets 4, 5 and 6 now avoid route A and all go by route B. The routers send the rest another way, with no new setup.',
      label: picture(
        'the link from Router 1 to your friend’s device is broken. Packets 1, 2 and 3 have arrived. Packets 4, 5 and 6 travel by route B through Router 2.',
      ),
    },
    {
      ...base,
      broken: true,
      packets: arrivedInOrder(seqs),
      caption:
        'All six packets arrive and the message is complete, even though a link failed halfway through. The detour was a little slower. Any packet caught on the broken link at that instant would have been lost, and the sender would send it again.',
      label: picture(
        'the link from Router 1 to your friend’s device is still broken, but all six packets have arrived at your friend’s device, in order.',
      ),
    },
  ];
}
