import type { Lesson } from '@/content/types';
import { TRANSFER_LAB_ID, TransferLab } from './lab';
import { quiz } from './quiz';
import { RealComputer } from './real';
import {
  MeasuredDeeper,
  TwoNumbers,
  WhySpeedConfusingDeeper,
} from './s1-highway';
import { AdvertisedDeeper, Bandwidth, PrefixesDeeper } from './s2-bandwidth';
import { DistanceFloorDeeper, JitterDeeper, Latency } from './s3-latency';
import { FillTheLinkDeeper, OverheadDeeper, Throughput } from './s4-throughput';
import { BandwidthDelay, SatelliteDeeper, WindowDeeper } from './s5-bdp';
import { CacheDeeper, SetupDeeper, SmallRequests } from './s6-small-requests';
import { CommonMistakes, WhichToBlameDeeper } from './s7-mistakes';
import { TRANSFER_SIM_ID } from './sim';
import { WhatAreYouWaitingFor } from './try';
import { CheatSheet, WhyItMatters } from './wrapUp';

// Lesson 1.5 "Bandwidth vs latency". This file only assembles the parts, in
// the order of spec section 7; each part lives in its own file.
const lesson: Lesson = {
  id: 'l1-bandwidth-latency',
  hook: 'Your plan says 500 megabits per second, yet a tiny web page still pauses before it appears, while a huge download finishes in seconds. If “fast” were one number, how could the same connection feel both slow and fast?',
  analogy: (
    <>
      <p>
        Think of a highway between two cities. The number of lanes is the
        bandwidth: it decides how many cars can travel side by side, so how many
        arrive each minute. The length of the road is the latency: it decides
        how long one car takes to make the trip. Cars are the bits of your data.
      </p>
      <p>
        To move a thousand cars, more lanes get them all there sooner. To move
        one car, extra lanes do nothing, and only a shorter road helps. Where
        the comparison stops working: delay is not only distance. Cars also wait
        in queues at junctions (routers), and they take time to load at the
        start. And unlike lanes you own, the bandwidth of a link is shared with
        everyone else who is using it at that moment.
      </p>
    </>
  ),
  sections: [
    {
      id: 'two-numbers',
      title: 'Two numbers, not one: how much and how long',
      body: <TwoNumbers />,
      deeper: [
        {
          title: 'How each of the two numbers is measured',
          body: <MeasuredDeeper />,
        },
        {
          title: 'Why the word “speed” causes trouble',
          body: <WhySpeedConfusingDeeper />,
        },
      ],
    },
    {
      id: 'bandwidth',
      title: 'Bandwidth: how much fits through each second',
      body: <Bandwidth />,
      deeper: [
        {
          title: 'Kilo, mega and giga: the prefixes',
          body: <PrefixesDeeper />,
        },
        {
          title: 'What “up to 500 Mbps” really promises',
          body: <AdvertisedDeeper />,
        },
      ],
    },
    {
      id: 'latency',
      title: 'Latency and its four sources of delay',
      body: <Latency />,
      deeper: [
        {
          title: 'The speed limit that distance sets',
          body: <DistanceFloorDeeper />,
        },
        {
          title: 'Why ping changes from reply to reply',
          body: <JitterDeeper />,
        },
      ],
    },
    {
      id: 'throughput',
      title: 'Throughput: the speed you actually get',
      body: <Throughput />,
      deeper: [
        {
          title: 'Overhead and resent data',
          body: <OverheadDeeper />,
        },
        {
          title: 'Why one download may not fill a fast, long link',
          body: <FillTheLinkDeeper />,
        },
      ],
    },
    {
      id: 'bandwidth-delay-product',
      title: 'The bandwidth-delay product: data on the road',
      body: <BandwidthDelay />,
      deeper: [
        {
          title: 'Why a sender waits for replies',
          body: <WindowDeeper />,
        },
        {
          title: 'Satellites: wide road, very long trip',
          body: <SatelliteDeeper />,
        },
      ],
    },
    {
      id: 'small-requests',
      title: 'Why small requests feel slow',
      body: <SmallRequests />,
      deeper: [
        {
          title: 'Why the first request costs extra round trips',
          body: <SetupDeeper />,
        },
        {
          title: 'How caches and CDNs shorten the road',
          body: <CacheDeeper />,
        },
      ],
    },
    {
      id: 'common-mistakes',
      title: 'Common mistakes and myths about “speed”',
      body: <CommonMistakes />,
      deeper: [
        {
          title: 'Which number to blame when something feels slow',
          body: <WhichToBlameDeeper />,
        },
      ],
    },
  ],
  primarySimulationId: TRANSFER_SIM_ID,
  tryIt: <WhatAreYouWaitingFor />,
  labs: [
    {
      id: TRANSFER_LAB_ID,
      title: 'How long does the download take?',
      render: ({ onDone }) => <TransferLab onDone={onDone} />,
    },
  ],
  realComputer: <RealComputer />,
  whyItMatters: <WhyItMatters />,
  quiz,
  recap: {
    oneLine:
      'Bandwidth is how much a link carries each second and latency is how long one message takes; total time is the latency plus the file size divided by the bandwidth, so a big file waits on bandwidth and a tiny request waits on latency.',
    takeaways: [
      'Bandwidth (Mbps, higher is better) is the width of the pipe. Latency (ms, lower is better) is the length of the road. A faster plan raises bandwidth; it does not shorten the road.',
      'Total time = latency + file size ÷ bandwidth. An 80-megabit file at 10 Mbps with 50 ms latency takes 8.05 seconds. Check the units: 8 bits make 1 byte, so 100 Mbps is at most 12.5 megabytes per second.',
      'Latency has four sources: propagation, transmission, queueing and processing delay. Distance sets a floor of about 5 ms per 1000 km of fibre.',
      'Throughput is what you really get, and it is at most the bandwidth. The bandwidth-delay product, bandwidth × round-trip time, is the data on the way at once: 100 Mbps × 20 ms = 2,000,000 bits.',
      'Small requests are dominated by round trips, so a wider pipe barely helps them. Fewer round trips, nearby copies and caches do.',
    ],
    cheatSheet: <CheatSheet />,
  },
  glossary: [
    'bandwidth',
    'latency',
    'bit',
    'byte',
    'megabit',
    'megabyte',
    'bottleneck',
    'download',
    'upload',
    'round-trip-time',
    'ping',
    'propagation-delay',
    'transmission-delay',
    'queueing-delay',
    'processing-delay',
    'packet',
    'throughput',
    'bandwidth-delay-product',
    'cdn',
  ],
};

export default lesson;
