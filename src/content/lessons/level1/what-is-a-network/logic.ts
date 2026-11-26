// Pure logic for the lesson "What is a network". No React (lint-enforced).
//
// journeySteps turns one ping through the simulated network into the steps of
// the lesson's simulation. networkVerdict decides the "Is it a network?"
// try-it. Neither ever throws: odd input gets a plain-English answer.

import { ping, type Device, type Network } from '@/netcore/network';

/**
 * One step of a message's trip. `at` lists the devices highlighted in this
 * step. The message itself is always on the LAST device in `at` (the sim draws
 * it there): on a link step that is the device it just reached, and on a
 * failure step it is the sender, because the message never left.
 */
export type JourneyStep = { caption: string; at: string[] };

const MISSING =
  'There is no such device in this network, so no message can be sent.';

function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

// True for a missing or empty setting (not for one that is filled in but wrong).
function blank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function nameOf(d: Device): string {
  return typeof d.name === 'string' && d.name.trim() !== '' ? d.name : d.id;
}

// Like ping, the first device with an id wins.
function find(devices: Device[], id: unknown): Device | undefined {
  if (typeof id !== 'string') return undefined;
  // A hand-built network may hold a null or a non-object; skip it.
  return (
    devices.find((d: Device | null | undefined) => d?.id === id) ?? undefined
  );
}

function arrived(path: Device[]): JourneyStep[] {
  const first = path[0];
  const last = path[path.length - 1];
  if (first === undefined || last === undefined) return [];
  const from = nameOf(first);
  const to = nameOf(last);
  const steps: JourneyStep[] = [
    {
      caption: `${from} has a message for ${to}, whose address is ${last.ip ?? ''}. ${from} sends it out over its link.`,
      at: [first.id],
    },
  ];
  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const here = path[i];
    if (prev === undefined || here === undefined) continue;
    const caption =
      here === last
        ? `The message travels along the last link, from ${nameOf(prev)} to ${to}.`
        : `The message travels along the link from ${nameOf(prev)} to ${nameOf(here)}. ${nameOf(here)} is a switch: it passes the message on toward ${to}.`;
    steps.push({ caption, at: [prev.id, here.id] });
  }
  const links = path.length - 1;
  const switches = path.length - 2;
  const through =
    switches === 0 ? 'no switch' : plural(switches, 'switch', 'switches');
  steps.push({
    caption: `${to} receives the message. It crossed ${plural(links, 'link', 'links')} and passed through ${through} on the way.`,
    at: [last.id],
  });
  return steps;
}

/**
 * The steps of a message sent from the device with id `from` to the device
 * with id `to`, found with the real `ping` of the simulated network.
 *
 * `to` is resolved to that device's own `ip`, and `ping(net, from, ip)` finds
 * the route. Results:
 * - a route: a start step, one step per link crossed, and an end step;
 * - `from === to`: one step (the message never leaves the device);
 * - no route: ONE step whose caption says why, in plain words (one per
 *   PingFailure, plus the case where another device answers to the same
 *   address, which would make the message go to the wrong place);
 * - an unknown id, a non-string id or a malformed network: one step saying
 *   there is no such device.
 */
export function journeySteps(
  net: Network,
  from: string,
  to: string,
): JourneyStep[] {
  const devices: unknown = (net as Network | undefined)?.devices;
  const links: unknown = (net as Network | undefined)?.links;
  if (!Array.isArray(devices) || !Array.isArray(links)) {
    return [{ caption: MISSING, at: [] }];
  }
  const list = devices as Device[];
  const source = find(list, from);
  const target = find(list, to);
  const at = source === undefined ? [] : [source.id];
  if (source === undefined || target === undefined) {
    return [{ caption: MISSING, at }];
  }

  const a = nameOf(source);
  const b = nameOf(target);
  // A switch in this course has no address: it never sends or receives for
  // itself, so it gets its own words instead of a request to type an address.
  if (source.kind === 'switch') {
    return [
      {
        caption: `${a} is a switch: it has no address of its own here and only passes other devices’ messages along. Pick a computer to send from.`,
        at,
      },
    ];
  }
  if (target.kind === 'switch') {
    return [
      {
        caption: `${a} cannot send a message to ${b}: a switch has no address of its own here. It only passes other devices’ messages along.`,
        at,
      },
    ];
  }
  if (source === target) {
    return [
      {
        caption: `${a} is sending a message to itself. The message never leaves ${a}, so it crosses no link.`,
        at,
      },
    ];
  }

  const result = ping(
    { devices: list, links: links as Network['links'] },
    source.id,
    typeof target.ip === 'string' ? target.ip : '',
  );
  if (!result.ok) {
    const why: Record<string, string> = {
      'no-ip-config': blank(source.ip)
        ? `${a} cannot send yet: it has no address of its own. Give it an IP address and a subnet mask first.`
        : `${a} cannot send yet: its IP address or subnet mask is not valid. Check both.`,
      'unknown-host': blank(target.ip)
        ? `${a} cannot reach ${b}: ${b} has no address yet, so there is nothing to send the message to.`
        : `${a} cannot reach ${b}: ${b} has no valid address (${String(target.ip)} is not an IP address), so there is nothing to send the message to.`,
      'different-network': `${a} cannot reach ${b}: their addresses put them in different networks. Joining two networks needs a router, which a later lesson covers.`,
      'no-path': `${a} cannot reach ${b}: no chain of links and switches joins them, so the message has no way to get there.`,
    };
    return [{ caption: why[result.failure ?? 'no-path'] ?? MISSING, at }];
  }

  const path = result.path
    .map((id) => find(list, id))
    .filter((d): d is Device => d !== undefined);
  const end = path[path.length - 1];
  if (end !== target) {
    const other = end === undefined ? 'another device' : nameOf(end);
    const pair = end === source ? `${a} and ${b}` : `${b} and ${other}`;
    return [
      {
        caption: `${pair} have the same address, ${target.ip ?? ''}, so messages cannot tell them apart. Every device needs its own address.`,
        at,
      },
    ];
  }
  return arrived(path);
}

// ---------------------------------------------------------------------------
// Try it: "Is it a network?"

export type TryDevice = { id: string; name: string };

/** The devices the learner can plug into the switch, in display order. */
export const TRY_DEVICES: readonly TryDevice[] = [
  { id: 'laptop', name: 'Laptop' },
  { id: 'desktop', name: 'Desktop' },
  { id: 'printer', name: 'Printer' },
  { id: 'tv', name: 'TV' },
];

// What each pair of devices could do together, keyed "first+second" in
// catalogue order. A pair that is missing has little to share.
const SHARING: Readonly<Record<string, string>> = {
  'laptop+desktop': 'Laptop and Desktop can swap files and photos.',
  'laptop+printer': 'Laptop can print a page on Printer.',
  'laptop+tv': 'Laptop can play a video on TV.',
  'desktop+printer': 'Desktop can print a page on Printer.',
  'desktop+tv': 'Desktop can play a video on TV.',
};

export type Verdict = {
  isNetwork: boolean;
  summary: string;
  details: string[];
};

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/**
 * Is a group of devices plugged into one switch a network? It is when the
 * switch has power and at least two devices are connected, because then they
 * can exchange data. Unknown ids and repeats are ignored; malformed input
 * counts as "nothing connected" and a switch that is not `true` is off.
 */
export function networkVerdict(input: {
  connected: readonly string[];
  switchOn: boolean;
}): Verdict {
  const raw: unknown = (input as { connected?: unknown } | undefined)
    ?.connected;
  const wanted = Array.isArray(raw) ? (raw as unknown[]) : [];
  const switchOn =
    (input as { switchOn?: unknown } | undefined)?.switchOn === true;
  const members = TRY_DEVICES.filter((d) => wanted.includes(d.id));
  const outside = TRY_DEVICES.filter((d) => !members.includes(d));
  const names = members.map((d) => d.name);
  const leftOut =
    outside.length === 0
      ? []
      : [
          `${joinNames(outside.map((d) => d.name))} ${outside.length === 1 ? 'has' : 'have'} no link, so ${outside.length === 1 ? 'it is' : 'they are'} not part of it.`,
        ];

  if (members.length === 0) {
    return {
      isNetwork: false,
      summary:
        'Not a network yet. Nothing is connected to the switch, so no device can share anything.',
      details: [],
    };
  }
  if (members.length === 1) {
    return {
      isNetwork: false,
      summary: `Not a network yet. ${names.join('')} is connected, but it has no other device to talk to. A network needs at least two.`,
      details: leftOut,
    };
  }
  if (!switchOn) {
    return {
      isNetwork: false,
      summary: `Not a network right now. The switch has no power, so it cannot pass messages between ${joinNames(names)}, even though their cables are plugged in.`,
      details: [],
    };
  }

  const uses: string[] = [];
  members.forEach((a, i) => {
    for (const b of members.slice(i + 1)) {
      const use = SHARING[`${a.id}+${b.id}`];
      if (use !== undefined) uses.push(use);
    }
  });
  if (uses.length === 0) {
    uses.push(
      `${joinNames(names)} have little to share with each other, but they can still exchange data, so they still form a network.`,
    );
  }
  return {
    isNetwork: true,
    summary: `This is a network: ${joinNames(names)} are linked through the switch.`,
    details: [...uses, ...leftOut],
  };
}
