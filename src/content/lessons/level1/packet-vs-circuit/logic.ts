// Pure logic for lesson 1.6, "Packet vs circuit switching". No React.
// Sizes are in bytes or bits and rates in bits per second. In this course
// 1 KB is 1000 bytes and 1 byte is 8 bits. Every function that takes numbers
// throws a RangeError for NaN, Infinity, negative or nonsense values, so a
// caller can never get NaN or Infinity back.

export type Packet = { seq: number; bytes: number };

/** A message is never split into more packets than this (guards memory). */
export const MAX_PACKETS = 100000;

const bad = (message: string): never => {
  throw new RangeError(message);
};

const isWhole = (n: number): boolean =>
  Number.isFinite(n) && Number.isInteger(n);

function needMoreThanZero(n: number, what: string): void {
  if (!Number.isFinite(n) || n <= 0) bad(`${what} must be more than zero.`);
}

function needZeroOrMore(n: number, what: string): void {
  if (!Number.isFinite(n) || n < 0) bad(`${what} must be zero or more.`);
}

function needHops(hops: number): void {
  if (!isWhole(hops) || hops < 1)
    bad('Hops must be a whole number, at least 1.');
}

/**
 * Cuts a message of `totalBytes` into packets of at most `maxPayload` bytes.
 * Every packet is full except possibly the last. `seq` counts from 1. An empty
 * message gives no packets.
 * @throws {RangeError} unless both numbers are whole, the message is not
 * negative, the payload is at least 1 byte and the result is no more than
 * MAX_PACKETS packets.
 */
export function splitIntoPackets(
  totalBytes: number,
  maxPayload: number,
): Packet[] {
  if (!isWhole(totalBytes) || totalBytes < 0) {
    bad('Message size must be a whole number of bytes, zero or more.');
  }
  if (!isWhole(maxPayload) || maxPayload < 1) {
    bad('Payload must be a whole number of bytes, at least 1.');
  }
  if (Math.ceil(totalBytes / maxPayload) > MAX_PACKETS) {
    bad(`That would be more than ${String(MAX_PACKETS)} packets.`);
  }
  const packets: Packet[] = [];
  for (let sent = 0; sent < totalBytes; sent += maxPayload) {
    packets.push({
      seq: packets.length + 1,
      bytes: Math.min(maxPayload, totalBytes - sent),
    });
  }
  return packets;
}

/**
 * Circuit switching: set the circuit up, then send the whole message at the
 * circuit's steady rate. Seconds = setup + messageBits / rate.
 * @throws {RangeError} for a negative setup or message, or a rate not above 0.
 */
export function circuitSwitchingSeconds(p: {
  setupSeconds: number;
  messageBits: number;
  rateBps: number;
}): number {
  needZeroOrMore(p.setupSeconds, 'Setup time');
  needZeroOrMore(p.messageBits, 'Message size');
  needMoreThanZero(p.rateBps, 'Rate');
  return p.setupSeconds + p.messageBits / p.rateBps;
}

/**
 * Packet switching with store-and-forward over `hops` links in a row, no
 * queueing: (N + hops - 1) x packetBits / rate, with N = messageBits /
 * packetBits. The first packet needs `hops` packet times, and each of the
 * other N - 1 packets follows one packet time behind it.
 * @throws {RangeError} unless the message is a whole number (at least 1) of
 * packets, hops is a whole number of at least 1, and the sizes and rate are
 * above zero.
 */
export function packetSwitchingSeconds(p: {
  messageBits: number;
  packetBits: number;
  hops: number;
  rateBps: number;
}): number {
  needMoreThanZero(p.messageBits, 'Message size');
  needMoreThanZero(p.packetBits, 'Packet size');
  needMoreThanZero(p.rateBps, 'Rate');
  needHops(p.hops);
  const n = p.messageBits / p.packetBits;
  if (!Number.isInteger(n)) {
    bad('The message must be a whole number of packets.');
  }
  return ((n + p.hops - 1) * p.packetBits) / p.rateBps;
}

/**
 * Message switching: the whole message is stored, then forwarded, at every
 * hop. Seconds = hops x messageBits / rate.
 * @throws {RangeError} for hops that is not a whole number of at least 1, a
 * negative message, or a rate not above 0.
 */
export function messageSwitchingSeconds(p: {
  messageBits: number;
  hops: number;
  rateBps: number;
}): number {
  needZeroOrMore(p.messageBits, 'Message size');
  needMoreThanZero(p.rateBps, 'Rate');
  needHops(p.hops);
  return (p.hops * p.messageBits) / p.rateBps;
}

// A link id is "a-b". The same link may be written "b-a", so a link counts as
// broken when either spelling is in the set. An id that is not of the form
// "a-b" (no dash, or more than one) matches only itself.
function isBroken(link: string, broken: ReadonlySet<string>): boolean {
  if (broken.has(link)) return true;
  const ends = link.split('-');
  const [a, b] = ends;
  return ends.length === 2 && a !== undefined && b !== undefined
    ? broken.has(`${b}-${a}`)
    : false;
}

/** True when no link of `route` is broken. An empty route cannot break. */
export function circuitSurvives(
  route: readonly string[],
  brokenLinks: ReadonlySet<string>,
): boolean {
  return !route.some((link) => isBroken(link, brokenLinks));
}

/**
 * Gives each of `packets` packets a route, round-robin over the routes that
 * have no broken link (first working route first). A packet gets `null` when
 * no route is left, or when there are no routes at all.
 * @throws {RangeError} unless `packets` is a whole number, zero or more.
 */
export function assignRoutes(
  routes: readonly (readonly string[])[],
  packets: number,
  brokenLinks: ReadonlySet<string>,
): (string[] | null)[] {
  if (!isWhole(packets) || packets < 0) {
    bad('The number of packets must be a whole number, zero or more.');
  }
  if (packets > MAX_PACKETS) bad('Too many packets.');
  const working = routes.filter((r) => circuitSurvives(r, brokenLinks));
  return Array.from({ length: packets }, (_, i) => {
    const route = working[i % Math.max(1, working.length)];
    return route === undefined ? null : [...route];
  });
}
