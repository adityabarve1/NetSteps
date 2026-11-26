// The steps of the primary simulation. Pure TypeScript: no React. Every time
// comes from the formulas in logic.ts, so the pictures, captions and theory
// agree. Sizes are megabits, rates megabits per second.

import {
  LESSON_NUMBERS as N,
  clientServerBottleneck,
  clientServerSeconds,
  describeLimit,
  formatSeconds,
  p2pBottleneck,
  p2pSeconds,
  type Bottleneck,
} from './logic';

export type StepMode = 'client-server' | 'p2p' | 'compare';

export type DistributionStep = {
  mode: StepMode;
  /** Clients or peers shown in the picture. */
  count: number;
  /** The time drawn as the main bar (client-server, or peer-to-peer). */
  seconds: number;
  /** Only in the comparison step: the peer-to-peer time. */
  otherSeconds?: number;
  limit: Bottleneck;
  caption: string;
  /** Text alternative for the picture. */
  label: string;
};

const plural = (n: number, word: string) =>
  `${String(n)} ${word}${n === 1 ? '' : 's'}`;

function clientServerStep(count: number, caption: string): DistributionStep {
  const p = { ...N, clients: count };
  const seconds = clientServerSeconds(p);
  const limit = clientServerBottleneck(p);
  return {
    mode: 'client-server',
    count,
    seconds,
    limit,
    caption,
    label: `Diagram: one server and ${plural(count, 'client')}. The server sends a separate copy of the file to each client. Time: ${formatSeconds(seconds)} seconds. The limit is ${describeLimit(limit)}.`,
  };
}

function p2pStep(count: number, caption: string): DistributionStep {
  const p = { ...N, peers: count };
  const seconds = p2pSeconds(p);
  const limit = p2pBottleneck(p);
  return {
    mode: 'p2p',
    count,
    seconds,
    limit,
    caption,
    label: `Diagram: one server and ${plural(count, 'peer')}. The peers also send pieces of the file to each other. Time: ${formatSeconds(seconds)} seconds. The limit is ${describeLimit(limit)}.`,
  };
}

/** The seven steps: client-server with 1, 5 and 10 clients, p2p likewise, then a comparison. */
export function distributionSteps(): DistributionStep[] {
  const csTen = clientServerSeconds({ ...N, clients: 10 });
  const p2pTen = p2pSeconds({ ...N, peers: 10 });
  return [
    clientServerStep(
      1,
      'One client asks the server for an 800-megabit file (100 megabytes). The server sends it once. The client downloads at 50 megabits per second, so 800 ÷ 50 = 16 seconds. The client’s own download speed is the limit.',
    ),
    clientServerStep(
      5,
      'Five clients ask at once. The server must upload five copies: 5 × 800 = 4000 megabits, at 100 megabits per second. That takes 4000 ÷ 100 = 40 seconds. Now the server’s upload speed is the limit.',
    ),
    clientServerStep(
      10,
      'Ten clients: 10 × 800 = 8000 megabits to upload at 100 megabits per second, so 8000 ÷ 100 = 80 seconds. Twice the clients (from 5 to 10) means twice the wait.',
    ),
    p2pStep(
      1,
      'Now peer-to-peer. With one peer, nobody else has any of the file yet, so the server is the only source: 16 seconds, the same as before. The peer’s download speed (50 megabits per second) is the limit.',
    ),
    p2pStep(
      5,
      'Five peers. Each one passes on the pieces it already has, and its upload (10 megabits per second) adds to the server’s 100. Together: 4000 ÷ (100 + 5 × 10), which is about 26.7 seconds.',
    ),
    p2pStep(
      10,
      'Ten peers: 8000 ÷ (100 + 10 × 10) = 40 seconds. Every new peer brings its own upload, so the group’s total upload grows as the group grows.',
    ),
    {
      mode: 'compare',
      count: 10,
      seconds: csTen,
      otherSeconds: p2pTen,
      limit: clientServerBottleneck({ ...N, clients: 10 }),
      caption: `Side by side, with 10 computers: client-server takes ${formatSeconds(csTen)} seconds and peer-to-peer takes ${formatSeconds(p2pTen)} seconds. In this model peer-to-peer is never slower. Real downloads add delays and overheads that the model leaves out.`,
      label: `Diagram: two bars for 10 computers. Client-server takes ${formatSeconds(csTen)} seconds. Peer-to-peer takes ${formatSeconds(p2pTen)} seconds.`,
    },
  ];
}
