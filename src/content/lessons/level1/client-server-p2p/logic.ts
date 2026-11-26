// Pure TypeScript for lesson 1.4: no React. The textbook "distribution time"
// model: how long until every computer has a copy of one file?
//
// Units: file sizes are in MEGABITS (Mb), rates in MEGABITS per second (Mbps),
// times in seconds. A file of 100 megabytes is 800 megabits (1 byte = 8 bits).
//
// The model is idealised: no delay, no protocol overhead, no congestion, and
// every upload is shared perfectly. Real downloads are slower and messier.

export type Bottleneck =
  'server upload' | 'client download' | 'peer upload sharing';

export type ClientServerParams = {
  /** File size in megabits. */
  fileMb: number;
  clients: number;
  serverUpMbps: number;
  clientDownMbps: number;
};

export type P2pParams = {
  /** File size in megabits. */
  fileMb: number;
  peers: number;
  serverUpMbps: number;
  peerUpMbps: number;
  peerDownMbps: number;
};

/** The numbers the lesson uses everywhere (megabits, megabits per second). */
export const LESSON_NUMBERS = {
  fileMb: 800,
  serverUpMbps: 100,
  clientDownMbps: 50,
  peerUpMbps: 10,
  peerDownMbps: 50,
} as const;

export const MIN_COUNT = 1;
export const MAX_COUNT = 50;

// Two times closer than this (relative) count as a tie.
const TIE = 1e-9;

function checkRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `${name} must be a number above 0 (got ${String(value)})`,
    );
  }
}

function checkFile(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`fileMb must be 0 or more (got ${String(value)})`);
  }
}

function checkCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `${name} must be a whole number of at least 1 (got ${String(value)})`,
    );
  }
}

function checkCs(p: ClientServerParams): void {
  checkFile(p.fileMb);
  checkCount('clients', p.clients);
  checkRate('serverUpMbps', p.serverUpMbps);
  checkRate('clientDownMbps', p.clientDownMbps);
}

function checkP2p(p: P2pParams): void {
  checkFile(p.fileMb);
  checkCount('peers', p.peers);
  checkRate('serverUpMbps', p.serverUpMbps);
  checkRate('peerUpMbps', p.peerUpMbps);
  checkRate('peerDownMbps', p.peerDownMbps);
}

/**
 * Seconds until every client has the file when one server sends it to all:
 * max(clients x file / server upload, file / client download).
 * Throws RangeError for a rate that is not above 0, a negative file, or a
 * client count that is not a whole number of at least 1.
 */
export function clientServerSeconds(p: ClientServerParams): number {
  checkCs(p);
  return Math.max(
    (p.clients * p.fileMb) / p.serverUpMbps,
    p.fileMb / p.clientDownMbps,
  );
}

/**
 * Seconds until every peer has the file when peers also upload to each other:
 * max(file / server upload, file / peer download,
 *     peers x file / (server upload + peers x peer upload)).
 * Throws RangeError for the same bad input as `clientServerSeconds`.
 */
export function p2pSeconds(p: P2pParams): number {
  checkP2p(p);
  return Math.max(
    p.fileMb / p.serverUpMbps,
    p.fileMb / p.peerDownMbps,
    (p.peers * p.fileMb) / (p.serverUpMbps + p.peers * p.peerUpMbps),
  );
}

/** Which part of the client-server model sets the time. A tie counts as the server. */
export function clientServerBottleneck(p: ClientServerParams): Bottleneck {
  checkCs(p);
  const server = (p.clients * p.fileMb) / p.serverUpMbps;
  const client = p.fileMb / p.clientDownMbps;
  return server >= client * (1 - TIE) ? 'server upload' : 'client download';
}

/** Which part of the peer-to-peer model sets the time (first of equals wins). */
export function p2pBottleneck(p: P2pParams): Bottleneck {
  checkP2p(p);
  const terms: [Bottleneck, number][] = [
    [
      'peer upload sharing',
      (p.peers * p.fileMb) / (p.serverUpMbps + p.peers * p.peerUpMbps),
    ],
    ['server upload', p.fileMb / p.serverUpMbps],
    ['client download', p.fileMb / p.peerDownMbps],
  ];
  const longest = Math.max(...terms.map(([, t]) => t));
  const hit = terms.find(([, t]) => t >= longest * (1 - TIE));
  return hit === undefined ? 'client download' : hit[0];
}

/** Megabytes to megabits: 1 byte = 8 bits. */
export function megabytesToMegabits(megabytes: number): number {
  if (!Number.isFinite(megabytes) || megabytes < 0) {
    throw new RangeError(
      `megabytes must be 0 or more (got ${String(megabytes)})`,
    );
  }
  return megabytes * 8;
}

/** "80", "26.7": at most one decimal. Anything that is not a time gives "unknown". */
export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  return String(Math.round(seconds * 10) / 10);
}

/** A count for the slider: a whole number from 1 to 50 (NaN gives 1). */
export function clampCount(value: number): number {
  if (Number.isNaN(value)) return MIN_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.trunc(value)));
}

export type Report = {
  count: number;
  clientServer: number;
  peerToPeer: number;
  clientServerLimit: Bottleneck;
  peerToPeerLimit: Bottleneck;
};

/** Both times and both bottlenecks for `count` computers, with the lesson's numbers. */
export function report(count: number): Report {
  const n = clampCount(count);
  const cs = { ...LESSON_NUMBERS, clients: n };
  const pp = { ...LESSON_NUMBERS, peers: n };
  return {
    count: n,
    clientServer: clientServerSeconds(cs),
    peerToPeer: p2pSeconds(pp),
    clientServerLimit: clientServerBottleneck(cs),
    peerToPeerLimit: p2pBottleneck(pp),
  };
}

const LIMIT_WORDS: Record<Bottleneck, string> = {
  'server upload': 'the server’s upload speed',
  'client download': 'the computer’s own download speed',
  'peer upload sharing': 'how much the peers can upload together',
};

/** The bottleneck in plain words, ready to put after "the limit is". */
export function describeLimit(limit: Bottleneck): string {
  return LIMIT_WORDS[limit];
}

/** One sentence comparing the two times of a report. */
export function compareText(r: Report): string {
  const saved = r.clientServer - r.peerToPeer;
  if (saved < 1e-9) return 'Both ways take the same time here.';
  return `Peer-to-peer finishes ${formatSeconds(saved)} seconds sooner.`;
}
