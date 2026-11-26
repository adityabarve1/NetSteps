import type { Lesson } from '@/content/types';
import { CLASSIFY_LAB_ID, ClassifyLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  OtherNamesDeeper,
  OwnershipDeeper,
  WhatMakesLocal,
} from './s1-what-makes-local';
import { BluetoothDeeper, Pan } from './s2-pan';
import { Lan, LanTechDeeper, PrivateAddressDeeper } from './s3-lan';
import { Man, MetroDeeper } from './s4-man';
import { DelayDeeper, SdWanDeeper, Wan } from './s5-wan';
import { InternetOfNetworks, TwoWaysDeeper } from './s6-internet';
import { OutgrownDeeper, RulesOfThumb } from './s7-rules-of-thumb';
import { SCOPE_SIM_ID } from './sim';
import { HowFarDoesItReach } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.2 "LAN, WAN and MAN". This file only assembles the parts, in the
// order of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-lan-wan-man',
  hook: 'You video-call a friend in another country, and the picture arrives almost at once. Yet the first device your call meets is the router in your own hallway. Is your home network the same kind of network as the long cables far away?',
  analogy: (
    <>
      <p>
        Think of getting around. The things on your desk are within arm&rsquo;s
        reach. The rooms in your building are joined by corridors that the
        building&rsquo;s owner looks after. The streets of one town join its
        buildings, and the town council looks after them. Highways and flights
        join far-apart towns and countries, and no single person looks after
        them: you use roads and airlines that belong to other people. Networks
        come in the same sizes. A PAN is your desk, a LAN is the corridors of
        one building, a MAN is the streets of one town, and a WAN is the
        highways and flights between far-apart places.
      </p>
      <p>
        Where the comparison stops working: nothing drives along the cables. A
        message travels as a signal, much faster than any car. Also, the edges
        are blurrier than the edge of a town. A big company can own its own
        long-distance links, and a network does not change its nature when it
        grows: only its distance, and who runs it, change.
      </p>
    </>
  ),
  sections: [
    {
      id: 'what-makes-local',
      title: 'What makes a network “local”',
      body: <WhatMakesLocal />,
      deeper: [
        {
          title: 'Ownership, not only distance, is the real difference',
          body: <OwnershipDeeper />,
        },
        {
          title: 'Other names you may meet: CAN and HAN',
          body: <OtherNamesDeeper />,
        },
      ],
    },
    {
      id: 'pan',
      title: 'PAN: the network around one person',
      body: <Pan />,
      deeper: [
        {
          title: 'Why Bluetooth has a short range, and what pairing is',
          body: <BluetoothDeeper />,
        },
      ],
    },
    {
      id: 'lan',
      title: 'LAN: one building, one owner',
      body: <Lan />,
      deeper: [
        {
          title: 'Ethernet and Wi-Fi: the two usual LAN technologies',
          body: <LanTechDeeper />,
        },
        {
          title: 'Why home networks use addresses that start with 192.168',
          body: <PrivateAddressDeeper />,
        },
      ],
    },
    {
      id: 'man',
      title: 'MAN: a network the size of a city',
      body: <Man />,
      deeper: [
        {
          title: 'Metro Ethernet, and where a MAN ends',
          body: <MetroDeeper />,
        },
      ],
    },
    {
      id: 'wan',
      title: 'WAN: joining networks across cities and countries',
      body: <Wan />,
      deeper: [
        {
          title: 'Why distance adds delay: a worked example',
          body: <DelayDeeper />,
        },
        {
          title: 'SD-WAN: managing several WAN links from one place',
          body: <SdWanDeeper />,
        },
      ],
    },
    {
      id: 'internet-network-of-networks',
      title: 'The internet: a network of networks',
      body: <InternetOfNetworks />,
      deeper: [
        {
          title: 'A private line or the internet with a VPN?',
          body: <TwoWaysDeeper />,
        },
      ],
    },
    {
      id: 'rules-of-thumb',
      title: 'Why the distance limits are only rules of thumb',
      body: <RulesOfThumb />,
      deeper: [
        {
          title: 'Technology has outgrown the old distance numbers',
          body: <OutgrownDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: SCOPE_SIM_ID,
  tryIt: <HowFarDoesItReach />,
  labs: [
    {
      id: CLASSIFY_LAB_ID,
      title: 'Sort networks by reach',
      render: ({ onDone }) => <ClassifyLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'Networks are named by how far they reach: a PAN around a person, a LAN in one place, a MAN across a city, a WAN between cities and countries, and the internet joins them all.',
    takeaways: [
      'The four sizes are rules of thumb, not standards: PAN about 10 m or less, LAN up to about 2 km, MAN up to about 100 km, WAN farther.',
      'A PAN is the network around one person (Bluetooth, a USB cable). A LAN is one building or campus, usually run by one owner, mostly with Ethernet and Wi-Fi.',
      'A MAN covers a city. A WAN joins LANs over long distances, usually with lines and services rented from telecom companies.',
      'Who runs the network often matters more than the number of kilometres: one owner points to a LAN, rented lines point to a WAN.',
      'The internet is a network of networks. It joins many LANs and WANs run by thousands of organisations, and no single organisation owns it. Home addresses such as 192.168.1.23 are private and live inside a LAN.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'pan',
    'lan',
    'man',
    'wan',
    'campus',
    'bluetooth',
    'tethering',
    'ethernet',
    'switch',
    'access-point',
    'router',
    'subnet',
    'private-address',
    'leased-line',
    'isp',
    'sd-wan',
    'internet',
    'vpn',
    'ip-address',
    'subnet-mask',
    'default-gateway',
  ],
};

export default lesson;
