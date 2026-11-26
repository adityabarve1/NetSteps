import type { Glossary } from '../types';

// Level 1 terms for lesson 1.4 (kept apart from level1.ts to stay under the
// file-length limit). Same rules as level1.ts.
export const level1ClientServer: Glossary = {
  // l1-client-server-p2p
  client: {
    term: 'client',
    definition:
      'A program, or the device running it, that asks another computer for a service. A web browser is a client when it asks for a page.',
  },
  'client-server': {
    term: 'client-server',
    definition:
      'A way of organising a service: clients send requests, and one or more servers answer them.',
  },
  request: {
    term: 'request',
    definition:
      'A message in which a client asks a server for something, such as a web page.',
  },
  response: {
    term: 'response',
    definition: 'The message a server sends back to answer a request.',
  },
  'data-centre': {
    term: 'data centre',
    definition:
      'A building full of servers and network equipment, with backup power, cooling and very fast links to the internet.',
  },
  megabit: {
    term: 'megabit',
    definition:
      'One million bits. A bit is the smallest piece of data, a 0 or a 1, and eight bits make one byte.',
  },
  upload: {
    term: 'upload',
    definition: 'To send data away from your device to another device.',
  },
  download: {
    term: 'download',
    definition: 'To receive data onto your device from another device.',
  },
  bottleneck: {
    term: 'bottleneck',
    definition:
      'The slowest part of a path or a process. It sets how fast the whole thing can go.',
  },
  'peer-to-peer': {
    term: 'peer-to-peer',
    definition:
      'A way of organising a service where computers share data directly with each other, and each one both asks for data and provides it. Often shortened to P2P.',
  },
  peer: {
    term: 'peer',
    definition:
      'A computer in a peer-to-peer network. It asks other peers for data and also answers when they ask it.',
  },
  swarm: {
    term: 'swarm',
    definition:
      'The group of peers that are sharing one file at the same time.',
  },
  'hybrid-model': {
    term: 'hybrid model',
    definition:
      'A design that mixes client-server and peer-to-peer ideas, for example servers that keep accounts and introduce users, while the users’ devices share the data.',
  },
  cdn: {
    term: 'CDN',
    definition:
      'Short for content delivery network: many servers in different places that keep copies of popular files, so each user is answered by a server nearby.',
  },
  'single-point-of-failure': {
    term: 'single point of failure',
    definition:
      'One part of a system that, if it stops working, stops the whole system.',
  },
  'physical-topology': {
    term: 'physical topology',
    definition:
      'How the devices and cables of a network are actually laid out.',
  },
  'logical-topology': {
    term: 'logical topology',
    definition:
      'How messages flow between the devices of a network, which can differ from how the cables are laid out.',
  },
  'default-gateway': {
    term: 'default gateway',
    definition:
      'The address of the router a device sends messages to when they are meant for another network, such as the internet.',
  },
  'load-balancer': {
    term: 'load balancer',
    definition:
      'A device or program that receives requests and hands each one to one of several servers that are working.',
  },
};
