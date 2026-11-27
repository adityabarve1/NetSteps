import type { Lesson } from '@/content/types';
import { FIRST_NETWORK_LAB_ID, FirstNetworkLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  HistoryDeeper,
  NodesDeeper,
  WhatANetworkIs,
} from './s1-what-a-network-is';
import {
  DevicesAndLinks,
  SwitchLearningDeeper,
  WiredWirelessDeeper,
} from './s2-devices-and-links';
import { PermissionsDeeper, WhatIsShared } from './s3-what-is-shared';
import {
  HostMeaningDeeper,
  HostsAndNetworkDevices,
  MoreDevicesDeeper,
} from './s4-hosts-and-network-devices';
import {
  AddressDetailsDeeper,
  Addresses,
  TwoAddressesDeeper,
} from './s5-addresses';
import { CommonMistakes, TroubleshootingDeeper } from './s6-common-mistakes';
import { JOURNEY_SIM_ID } from './sim';
import { IsItANetwork } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.1 "What is a network". This file only assembles the parts, in the
// order of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-what-is-a-network',
  hook: 'You send a photo from your phone, and a second later it appears on a friend’s laptop across town. What had to exist between those two devices to make that happen?',
  analogy: (
    <>
      <p>
        Think of a town. The houses are the devices: laptops, phones, printers.
        The roads between them are the links. Where roads meet, junctions send
        traffic the right way; in a network, switches and routers do that job.
        Every house has a street address so a letter can find it, and every
        device on a network has an address too. A network is the whole system
        that lets something leave one house and arrive at another.
      </p>
      <p>
        Where the comparison stops working: nothing drives down the road. A
        message travels as a signal (electricity, light or radio) far faster
        than any car, and the sender usually keeps its own copy. Also, a device
        can have more than one address, and its address can change, which rarely
        happens to a house.
      </p>
    </>
  ),
  sections: [
    {
      id: 'what-a-network-is',
      title: 'What makes something a network',
      body: <WhatANetworkIs />,
      deeper: [
        { title: 'Nodes: how engineers draw a network', body: <NodesDeeper /> },
        { title: 'The first message on ARPANET', body: <HistoryDeeper /> },
      ],
    },
    {
      id: 'devices-and-links',
      title: 'Devices and links: the two building blocks',
      body: <DevicesAndLinks />,
      deeper: [
        {
          title: 'Wired or wireless: what each one trades',
          body: <WiredWirelessDeeper />,
        },
        {
          title: 'How a switch learns which way to send',
          body: <SwitchLearningDeeper />,
        },
      ],
    },
    {
      id: 'what-is-shared',
      title: 'What a network lets devices share',
      body: <WhatIsShared />,
      deeper: [
        {
          title: 'Being on a network is not sharing everything',
          body: <PermissionsDeeper />,
        },
      ],
    },
    {
      id: 'hosts-and-network-devices',
      title: 'Hosts and network devices: users and helpers',
      body: <HostsAndNetworkDevices />,
      deeper: [
        {
          title: 'What “host” means to engineers',
          body: <HostMeaningDeeper />,
        },
        {
          title: 'Other network devices you will meet later',
          body: <MoreDevicesDeeper />,
        },
      ],
    },
    {
      id: 'addresses-in-one-minute',
      title: 'Addresses in one minute',
      body: <Addresses />,
      deeper: [
        {
          title: 'Why devices have two kinds of address',
          body: <TwoAddressesDeeper />,
        },
        {
          title: 'Slash notation, reserved numbers and private addresses',
          body: <AddressDetailsDeeper />,
        },
      ],
    },
    {
      id: 'common-mistakes',
      title: 'Common mistakes and myths',
      body: <CommonMistakes />,
      deeper: [
        {
          title: 'A first troubleshooting checklist',
          body: <TroubleshootingDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: JOURNEY_SIM_ID,
  tryIt: <IsItANetwork />,
  labs: [
    {
      id: FIRST_NETWORK_LAB_ID,
      title: 'Build your first network',
      render: ({ onDone }) => <FirstNetworkLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'A network is two or more devices joined by links so they can exchange data; hosts send and receive, network devices pass messages along, and addresses tell messages where to go.',
    takeaways: [
      'One device alone is not a network: you need at least two devices and a link between them.',
      'Links are wired (Ethernet copper, fibre) or wireless (Wi-Fi, Bluetooth, mobile). They carry signals, and the devices turn those back into data.',
      'Hosts, such as laptops, phones and servers, send and receive their own data. Network devices, such as switches and routers, pass other devices’ data along. An ordinary computer does not.',
      'Every host on an IP network (home Wi-Fi, a school network) has an IP address such as 192.168.1.10. With mask 255.255.255.0, devices whose first three numbers match are in the same subnet and can reach each other through a switch.',
      'The internet is a network of networks. The web is one service on it, and Wi-Fi is only one kind of link.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'network',
    'wi-fi',
    'internet',
    'protocol',
    'node',
    'network-adapter',
    'link',
    'ethernet',
    'switch',
    'packet',
    'server',
    'host',
    'network-device',
    'router',
    'access-point',
    'modem',
    'ip-address',
    'subnet-mask',
    'subnet',
    'web',
    'loopback-address',
    'ping',
  ],
};

export default lesson;
