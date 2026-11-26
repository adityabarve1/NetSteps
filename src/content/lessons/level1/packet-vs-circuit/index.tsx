import type { Lesson } from '@/content/types';
import { PACKETS_LAB_ID, PacketsLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  CableCountDeeper,
  SwitchWordDeeper,
  WhySwitching,
} from './s1-why-switching';
import {
  CircuitSwitching,
  CircuitToday,
  MultiplexingDeeper,
} from './s2-circuit-switching';
import { HeaderDeeper, PacketSizeDeeper, Packets } from './s3-packets';
import {
  FormulaLimitsDeeper,
  QueueingDeeper,
  StoreAndForward,
} from './s4-store-and-forward';
import { LossDeeper, SharingLinks, StatisticalDeeper } from './s5-sharing';
import {
  Comparing,
  MessageSwitchingDeeper,
  VirtualCircuitDeeper,
} from './s6-comparing';
import {
  PriorityDeeper,
  RealExamples,
  VoiceAsPacketsDeeper,
} from './s7-real-examples';
import { SWITCHING_SIM_ID } from './sim';
import { SwitchingTimes } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.6 "Packet vs circuit switching". This file only assembles the
// parts, in the order of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-packet-vs-circuit',
  hook: 'You can call a friend on the other side of the world and hear them without a gap, and a minute later you can load a web page made of hundreds of tiny pieces. Both cross the same planet. Why would a network handle a phone call and a web page in two very different ways?',
  analogy: (
    <>
      <p>
        Compare a phone call with the post. A phone call holds a line for you:
        once you are connected, the line is yours until you hang up, even
        through the silences. The post works differently. You tear a long letter
        into numbered postcards, and each one goes into the system by itself,
        travelling with all the other mail. At the far end, your friend puts the
        postcards in order. The phone call is circuit switching. The postcards
        are packet switching.
      </p>
      <p>
        Where the comparison stops working: postcards can take days, while
        packets cross a continent in a fraction of a second. A real postcard
        system also does not tell you when one is lost, but a packet network
        usually does, and the two computers at the ends send the missing piece
        again. And a phone call does not only get an open road: it gets real
        capacity set aside for it alone.
      </p>
    </>
  ),
  sections: [
    {
      id: 'why-we-need-a-switching-method',
      title: 'Why we need a switching method',
      body: <WhySwitching />,
      deeper: [
        {
          title: 'Where the count of cables comes from',
          body: <CableCountDeeper />,
        },
        {
          title: 'Switching and switches: one word, two uses',
          body: <SwitchWordDeeper />,
        },
      ],
    },
    {
      id: 'circuit-switching-and-the-phone-network',
      title: 'Circuit switching and the old phone network',
      body: <CircuitSwitching />,
      deeper: [
        {
          title: 'How one wire carried many calls',
          body: <MultiplexingDeeper />,
        },
        {
          title: 'Is circuit switching gone?',
          body: <CircuitToday />,
        },
      ],
    },
    {
      id: 'packets',
      title: 'Packets: a message in numbered pieces',
      body: <Packets />,
      deeper: [
        { title: 'What is inside a header', body: <HeaderDeeper /> },
        {
          title: 'Why packets are often about 1500 bytes',
          body: <PacketSizeDeeper />,
        },
      ],
    },
    {
      id: 'store-and-forward',
      title: 'Store and forward: how packets cross several hops',
      body: <StoreAndForward />,
      deeper: [
        {
          title: 'Where waiting in a queue comes from',
          body: <QueueingDeeper />,
        },
        {
          title: 'What the packet-time formula leaves out',
          body: <FormulaLimitsDeeper />,
        },
      ],
    },
    {
      id: 'why-packets-share-links-efficiently',
      title: 'Why packets share links efficiently',
      body: <SharingLinks />,
      deeper: [
        {
          title: 'Statistical multiplexing and its limits',
          body: <StatisticalDeeper />,
        },
        {
          title: 'Who repairs a lost packet',
          body: <LossDeeper />,
        },
      ],
    },
    {
      id: 'comparing-the-two',
      title: 'Comparing circuit and packet switching',
      body: <Comparing />,
      deeper: [
        {
          title: 'Message switching: the third way',
          body: <MessageSwitchingDeeper />,
        },
        {
          title: 'Virtual circuits: a blend of both',
          body: <VirtualCircuitDeeper />,
        },
      ],
    },
    {
      id: 'real-examples',
      title: 'Real examples: the internet, phones and video calls',
      body: <RealExamples />,
      deeper: [
        {
          title: 'How a voice call becomes packets',
          body: <VoiceAsPacketsDeeper />,
        },
        {
          title: 'Priority: asking for a better lane',
          body: <PriorityDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: SWITCHING_SIM_ID,
  tryIt: <SwitchingTimes />,
  labs: [
    {
      id: PACKETS_LAB_ID,
      title: 'Count the packets',
      render: ({ onDone }) => <PacketsLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'Circuit switching reserves a path for a whole conversation; packet switching cuts messages into numbered packets that share links, which is why the internet uses it.',
    takeaways: [
      'Circuit switching sets up a path first and holds it, so the data arrives steadily and in order. The price is setup time, wasted capacity in silences, and a dropped call if a link on the path fails.',
      'Packet switching cuts a message into packets, each with a header (labels, including a sequence number) and a payload. A 3500-byte message at 1000 bytes per packet needs 4 packets, because you round up.',
      'Routers use store and forward, and packets can overlap on the links. Eight packets over three hops take (8 + 3 − 1) × 1 = 10 seconds in our model, against 24 seconds if the whole message is stored at each hop.',
      'Packets share links well for bursty traffic and can be rerouted around a failure. The price is delay that varies, queues, headers on every packet, and packets that can be lost or arrive out of order.',
      'Real networks are a mix. The internet is packet switched, much voice now travels as packets (VoIP), and some links still reserve capacity or give voice priority.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'route',
    'link',
    'router',
    'circuit-switching',
    'circuit',
    'leased-line',
    'packet-switching',
    'packet',
    'header',
    'payload',
    'sequence-number',
    'hop',
    'store-and-forward',
    'queue',
    'message-switching',
    'voip',
  ],
};

export default lesson;
