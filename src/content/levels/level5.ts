import type { LevelMeta } from '../types.ts';

export const level5: LevelMeta = {
  id: 'level-5',
  number: 5,
  title: 'Transport',
  summary:
    'Learn how data finds the right program on a computer, how TCP and UDP deliver it, and how a connection copes with lost data and busy networks.',
  lessons: [
    {
      id: 'l5-ports',
      levelId: 'level-5',
      title: 'Ports',
      summary:
        'See how port numbers let one computer run many network programs at once, and meet the common ones, like 443 for secure web pages.',
      minutes: 12,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-tcp-vs-udp',
      levelId: 'level-5',
      title: 'TCP vs UDP',
      summary:
        'Compare TCP, which makes sure data arrives complete and in order, with UDP, which skips those checks, and learn when each fits best.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-three-way-handshake',
      levelId: 'level-5',
      title: '3-way handshake and teardown',
      summary:
        'Watch two computers open a TCP connection with three messages, and then close it again in an orderly way.',
      minutes: 15,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-acks-sliding-window',
      levelId: 'level-5',
      title: 'ACKs, retransmission, sliding window',
      summary:
        'See how TCP learns that data arrived, resends what was lost, and sends several pieces before waiting for a reply by using a sliding window.',
      minutes: 22,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-flow-control',
      levelId: 'level-5',
      title: 'Flow control',
      summary:
        'Learn how a receiver tells the sender to slow down when it cannot keep up, so a fast sender does not overwhelm a slow computer.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-congestion-control',
      levelId: 'level-5',
      title: 'Congestion control',
      summary:
        'Watch a live graph to see how TCP speeds up when the network is clear and slows down when it gets crowded.',
      minutes: 22,
      built: false,
      labIds: [],
    },
    {
      id: 'l5-quic',
      levelId: 'level-5',
      title: 'QUIC',
      summary:
        'Learn what QUIC does differently from TCP, how it sets up a connection faster, and why HTTP/3 is built on it.',
      minutes: 14,
      built: false,
      labIds: [],
    },
  ],
};
