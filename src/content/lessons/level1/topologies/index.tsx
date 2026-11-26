import type { Lesson } from '@/content/types';
import { STAR_LAB_ID, StarLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  GraphDeeper,
  NodeKindsDeeper,
  WhyLayoutMatters,
} from './s1-why-layout-matters';
import { Bus, BusBreakDeeper, CoaxDeeper } from './s2-bus';
import { BusToStarDeeper, ExtendedStarDeeper, Star } from './s3-star';
import { DualRingDeeper, Ring, TokenRingDeeper } from './s4-ring';
import { Mesh, MeshGrowthDeeper, PartialMeshDeeper } from './s5-mesh';
import { Compare, RealWorldDeeper } from './s6-compare';
import {
  HybridDeeper,
  LogicalVsPhysical,
  WifiDeeper,
} from './s7-logical-physical';
import { TOPOLOGY_SIM_ID } from './sim';
import { BreakIt } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.3 "Topologies". This file only assembles the parts, in the order
// of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-topologies',
  hook: 'One evening the router in your hall loses power, and every device in the house goes offline at once. A week later one laptop drops its Wi-Fi and nobody else notices. Why did two breaks in the same home matter so differently?',
  analogy: (
    <>
      <p>
        Think of a seating plan. Five people can sit in a row on one bench, and
        whatever one says, the whole bench hears (a bus). They can sit round a
        table with a host in the middle who passes every message on (a star).
        They can sit in a circle and pass notes hand to hand (a ring). Or each
        person can have a private line to every other person (a mesh). Who can
        still talk when one person leaves, or when one seat is blocked, depends
        entirely on the plan.
      </p>
      <p>
        Where the comparison stops working: people can shout across a room, but
        a network message only follows cables or radio links. Also, the plan you
        see (where the chairs stand) can differ from the way messages really
        flow. The last section of this lesson explains that difference.
      </p>
    </>
  ),
  sections: [
    {
      id: 'why-layout-matters',
      title: 'Why the layout of a network matters',
      body: <WhyLayoutMatters />,
      deeper: [
        { title: 'Nodes, links and degree', body: <GraphDeeper /> },
        {
          title: 'What can a node be, and what must it do?',
          body: <NodeKindsDeeper />,
        },
      ],
    },
    {
      id: 'bus',
      title: 'Bus: one shared cable',
      body: <Bus />,
      deeper: [
        {
          title: 'How a coaxial bus worked, and why it needed terminators',
          body: <CoaxDeeper />,
        },
        {
          title: 'Why a broken bus stops everyone in our model',
          body: <BusBreakDeeper />,
        },
      ],
    },
    {
      id: 'star',
      title: 'Star: everything through one centre',
      body: <Star />,
      deeper: [
        {
          title: 'Why Ethernet moved from a bus to a star',
          body: <BusToStarDeeper />,
        },
        {
          title: 'Stars joined to stars: trees and extended stars',
          body: <ExtendedStarDeeper />,
        },
      ],
    },
    {
      id: 'ring',
      title: 'Ring: a closed loop',
      body: <Ring />,
      deeper: [
        {
          title: 'Token Ring and FDDI: how real rings worked',
          body: <TokenRingDeeper />,
        },
        {
          title: 'How a dual ring survives one break',
          body: <DualRingDeeper />,
        },
      ],
    },
    {
      id: 'mesh',
      title: 'Mesh and partial mesh: many routes',
      body: <Mesh />,
      deeper: [
        {
          title: 'Why the cable count of a full mesh grows so fast',
          body: <MeshGrowthDeeper />,
        },
        {
          title: 'A partial mesh can still be cut in two',
          body: <PartialMeshDeeper />,
        },
      ],
    },
    {
      id: 'compare',
      title: 'Comparing cost, cable and what breaks',
      body: <Compare />,
      deeper: [
        {
          title: 'Where real networks bend our failure rules',
          body: <RealWorldDeeper />,
        },
      ],
    },
    {
      id: 'logical-vs-physical',
      title: 'Logical versus physical topology',
      body: <LogicalVsPhysical />,
      deeper: [
        {
          title: 'Hybrid topologies: mixing the shapes',
          body: <HybridDeeper />,
        },
        {
          title: 'Wi-Fi: a star that shares one radio channel',
          body: <WifiDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: TOPOLOGY_SIM_ID,
  tryIt: <BreakIt />,
  labs: [
    {
      id: STAR_LAB_ID,
      title: 'Build a star',
      render: ({ onDone }) => <StarLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'A topology is the shape of a network: a bus shares one cable, a star joins every device to a centre, a ring joins devices in a loop, and a mesh joins devices to many others. Each shape fails in its own way.',
    takeaways: [
      'Topology is the pattern of devices and links. Compare shapes by cable and sockets needed, what breaks, and how hard it is to grow.',
      'A bus shares one backbone, and in our model a cut backbone stops everyone. A star gives each device its own cable, so a cut cable cuts off one device, but a failed switch stops everyone.',
      'In a single ring, one cut link or one failed device stops everyone. Real rings add a second path (dual rings) to survive a break.',
      'A full mesh of n devices needs n(n − 1) / 2 cables, so it grows fast. A partial mesh keeps only the important links, and the internet is a partial mesh of networks.',
      'Physical topology is how the cables are laid out and logical topology is how messages flow, and they can differ. Your home network is a star around the router.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'topology',
    'node',
    'bus-topology',
    'star-topology',
    'ring-topology',
    'mesh-topology',
    'single-point-of-failure',
    'backbone',
    'terminator',
    'switch',
    'default-gateway',
    'partial-mesh',
    'physical-topology',
    'logical-topology',
  ],
};

export default lesson;
