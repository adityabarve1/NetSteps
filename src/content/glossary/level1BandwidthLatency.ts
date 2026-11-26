import type { Glossary } from '../types';

// Level 1 terms for lesson 1.5 (kept apart from level1.ts to stay under the
// file-length limit). Same rules as level1.ts: one or two short sentences, no
// undefined jargon, and an existing id is reused rather than added twice
// (megabit, upload, download, bottleneck and ping already exist).
export const level1BandwidthLatency: Glossary = {
  // l1-bandwidth-latency
  bit: {
    term: 'bit',
    definition:
      'The smallest piece of data: a single 0 or 1. Network speeds are counted in bits per second.',
  },
  byte: {
    term: 'byte',
    definition:
      'Eight bits. Files are usually measured in bytes, such as kilobytes and megabytes.',
  },
  megabyte: {
    term: 'megabyte',
    definition:
      'One million bytes, which is eight million bits (eight megabits). Written MB, with a capital B.',
  },
  bandwidth: {
    term: 'bandwidth',
    definition:
      'The most data a link can carry each second, measured in bits per second, such as megabits per second (Mbps). It is the width of the pipe, not the length of the road.',
  },
  latency: {
    term: 'latency',
    definition:
      'The time one piece of data takes to get from one place to another, usually measured in milliseconds. It is the length of the road, not the width of the pipe.',
  },
  'round-trip-time': {
    term: 'round-trip time',
    definition:
      'The time for a message to go to another computer and for the reply to come back. Ping reports it. Often shortened to RTT.',
  },
  throughput: {
    term: 'throughput',
    definition:
      'The data rate you actually get during a transfer. It can be lower than the bandwidth of the link, because of delays, other traffic and overhead.',
  },
  'propagation-delay': {
    term: 'propagation delay',
    definition:
      'The time a signal needs to travel along the cable or through the air. It grows with distance and cannot be removed.',
  },
  'transmission-delay': {
    term: 'transmission delay',
    definition:
      'The time to put all the bits of a message onto the link. It is the message size divided by the bandwidth.',
  },
  'queueing-delay': {
    term: 'queueing delay',
    definition:
      'The time a message waits in line inside a device, such as a router, because other data is being sent first.',
  },
  'processing-delay': {
    term: 'processing delay',
    definition:
      'The time a device spends reading a message and deciding what to do with it. It is usually very small.',
  },
  'bandwidth-delay-product': {
    term: 'bandwidth-delay product',
    definition:
      'Bandwidth multiplied by round-trip time: the number of bits that can be on the way at the same time. It tells you how much data a sender must keep in flight to fill the link.',
  },
};
