import type { Glossary } from '../types';

// Level 1 terms for lesson 1.6 (kept apart from level1.ts to stay under the
// file-length limit). Same rules as level1.ts. `packet`, `link`, `router` and
// `bottleneck` already exist there and are reused.
export const level1PacketCircuit: Glossary = {
  // l1-packet-vs-circuit
  route: {
    term: 'route',
    definition:
      'The path a message takes from the sender to the receiver, through links and routers.',
  },
  circuit: {
    term: 'circuit',
    definition:
      'A path across a network that is set aside for one conversation, such as one phone call, until it ends.',
  },
  'circuit-switching': {
    term: 'circuit switching',
    definition:
      'A way of moving data in which the network first reserves a path for the whole conversation, then sends the data along it. The old telephone network worked this way.',
  },
  'packet-switching': {
    term: 'packet switching',
    definition:
      'A way of moving data in which a message is cut into packets that share links with other traffic and are passed on from router to router. The internet works this way.',
  },
  header: {
    term: 'header',
    definition:
      'The label at the front of a packet. It says who sent the packet, where it is going and which piece of the message it is.',
  },
  payload: {
    term: 'payload',
    definition:
      'The part of a packet that carries the data itself, such as one piece of a message.',
  },
  'sequence-number': {
    term: 'sequence number',
    definition:
      'A number on a packet that says its place in the message, so the receiver can put the packets back in order.',
  },
  hop: {
    term: 'hop',
    definition:
      'One step of a trip across a network: the crossing of one link from one device to the next.',
  },
  'store-and-forward': {
    term: 'store and forward',
    definition:
      'The way a router handles a packet: it receives the whole packet, checks it, then sends it on toward its destination.',
  },
  queue: {
    term: 'queue',
    definition:
      'A line of packets waiting in a router for a busy link to become free.',
  },
  'message-switching': {
    term: 'message switching',
    definition:
      'A way of moving data in which each device along the way stores the whole message and then passes it on to the next one.',
  },
  voip: {
    term: 'VoIP (voice over IP)',
    definition:
      'Phone calls carried as packets over a network such as the internet.',
  },
};
