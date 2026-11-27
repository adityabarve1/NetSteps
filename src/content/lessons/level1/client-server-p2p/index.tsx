import type { Lesson } from '@/content/types';
import { SERVER_LAB_ID, ServerLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  ClientServerIdea,
  OneComputerManyServersDeeper,
  RolesDeeper,
} from './s1-client-server-idea';
import {
  RealLife,
  ServerIsAlsoClientDeeper,
  WhatServersNeedDeeper,
} from './s2-real-life';
import {
  BitsAndBytesDeeper,
  ModelAssumptionsDeeper,
  StrengthsAndWeaknesses,
} from './s3-strengths-weaknesses';
import {
  P2pFormulaDeeper,
  PeerToPeer,
  SwarmingDeeper,
} from './s4-peer-to-peer';
import { CdnDeeper, Hybrid, WhyMixDeeper } from './s5-hybrid';
import {
  AvailabilityDeeper,
  ScaleUpOutDeeper,
  ScalingAndFailure,
} from './s6-scaling-failure';
import { DISTRIBUTION_SIM_ID } from './sim';
import { WaitTimes } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.4 "Client-server vs peer-to-peer". This file only assembles the
// parts, in the order of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-client-server-p2p',
  hook: 'A game goes on sale and a million people click “download” in the same minute. Why does the shop’s site slow to a crawl, while some other kinds of download hold up well even with a huge crowd?',
  analogy: (
    <>
      <p>
        Think of two ways to feed a crowd. In a restaurant, the diners sit and
        order, and one kitchen cooks everything and serves it. In a potluck,
        everyone brings a dish, and everyone both eats and shares. The
        restaurant is client-server: the diners are the clients and the kitchen
        is the server. The potluck is peer-to-peer: every guest is both.
      </p>
      <p>
        Where the comparison stops working: a restaurant has one kitchen, but a
        large online service often has many identical ones. A kitchen can also
        be a customer of someone else, such as the farm that supplies its
        vegetables, in the same way a server can ask another server for
        something. And in a network, who plays which role is set by the program,
        not by the building.
      </p>
    </>
  ),
  sections: [
    {
      id: 'client-server-idea',
      title: 'The client-server idea: one asks, one serves',
      body: <ClientServerIdea />,
      deeper: [
        {
          title: 'A client or a server is a role, not a kind of hardware',
          body: <RolesDeeper />,
        },
        {
          title: 'How one computer can run several servers',
          body: <OneComputerManyServersDeeper />,
        },
      ],
    },
    {
      id: 'servers-and-clients-in-real-life',
      title: 'Servers and clients in real life',
      body: <RealLife />,
      deeper: [
        {
          title: 'A server can be a client of another server',
          body: <ServerIsAlsoClientDeeper />,
        },
        {
          title: 'What a busy server needs',
          body: <WhatServersNeedDeeper />,
        },
      ],
    },
    {
      id: 'strengths-and-weaknesses',
      title: 'Strengths and weaknesses of client-server',
      body: <StrengthsAndWeaknesses />,
      deeper: [
        {
          title: 'The distribution-time model and what it leaves out',
          body: <ModelAssumptionsDeeper />,
        },
        {
          title: 'Bits, bytes, Mbps and MB/s',
          body: <BitsAndBytesDeeper />,
        },
      ],
    },
    {
      id: 'peer-to-peer',
      title: 'Peer-to-peer: everyone serves everyone',
      body: <PeerToPeer />,
      deeper: [
        {
          title: 'How BitTorrent-style swarming splits a file',
          body: <SwarmingDeeper />,
        },
        {
          title: 'The peer-to-peer formula and its limits',
          body: <P2pFormulaDeeper />,
        },
      ],
    },
    {
      id: 'hybrid-models',
      title: 'Hybrid models: servers and peers together',
      body: <Hybrid />,
      deeper: [
        { title: 'What a CDN does', body: <CdnDeeper /> },
        {
          title: 'Why real services rarely use a pure design',
          body: <WhyMixDeeper />,
        },
      ],
    },
    {
      id: 'scaling-and-single-point-of-failure',
      title: 'Scaling and the single point of failure',
      body: <ScalingAndFailure />,
      deeper: [
        {
          title: 'Scaling up or scaling out',
          body: <ScaleUpOutDeeper />,
        },
        {
          title: 'Availability in numbers: why a second server helps',
          body: <AvailabilityDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: DISTRIBUTION_SIM_ID,
  tryIt: <WaitTimes />,
  labs: [
    {
      id: SERVER_LAB_ID,
      title: 'A server and three computers',
      render: ({ onDone }) => <ServerLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'In client-server, clients ask and a server answers; in peer-to-peer, every computer both asks and answers; many real services mix the two and keep several servers so that no single part can stop everything.',
    takeaways: [
      'Client and server are roles of programs in a conversation, not kinds of hardware. The client asks with a request; the server answers with a response.',
      'Client-server is simple to manage and control, but the server’s upload is shared by every client. In our model (an 800-megabit file, server upload 100 Mbps) 10 clients take 80 seconds, and twice the clients means twice the time.',
      'In peer-to-peer, each peer adds upload capacity as well as demand, so 10 peers take 40 seconds in the same model. It is not always faster: it depends on how many peers there are and how much they upload.',
      'Hybrids give some jobs to servers (accounts, finding peers) and others to peers or to many servers, as with a CDN.',
      'A single server is a single point of failure. Real services keep several servers, and the model used here is an idealised textbook model, not a prediction for real downloads.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'client',
    'server',
    'client-server',
    'request',
    'response',
    'data-centre',
    'megabit',
    'upload',
    'download',
    'bottleneck',
    'peer-to-peer',
    'peer',
    'swarm',
    'hybrid-model',
    'cdn',
    'single-point-of-failure',
    'load-balancer',
  ],
};

export default lesson;
