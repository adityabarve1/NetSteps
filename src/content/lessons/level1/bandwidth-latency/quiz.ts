import type { QuizQuestion } from '@/content/types';

// Five questions, one per big idea of the lesson. Correct answers sit at
// positions 1, 3, 0, 2 and 1. Every explanation says why the right answer is
// right and why each other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt:
      'You upgrade your home plan from 50 Mbps to 500 Mbps. Afterwards, ping to the same game server still shows about 40 ms. Why?',
    options: [
      'The upgrade has not taken effect yet, because ping always shows your new speed',
      'Ping reports the delay of the trip, and a wider pipe does not make the trip shorter',
      'Ping only measures upload speed, and the upgrade changed your download speed',
      'Bandwidth and latency are the same thing, so one of them must have stayed at 50',
    ],
    correctIndex: 1,
    explanation:
      'Ping times a small message on its way there and back. That is latency, the length of the road. A bigger plan widens the pipe but does not shorten the road. The upgrade probably did work: ping does not show speed in Mbps, so it cannot reveal it. Ping does not measure upload speed either. And bandwidth and latency are different things: one is how much data fits through each second, the other is how long a trip takes.',
  },
  {
    id: 'q2',
    prompt:
      'A 160-megabit file crosses a link of 20 Mbps with 100 ms of latency. How long until the whole file has arrived?',
    options: ['8 seconds', '9 seconds', '108 seconds', '8.1 seconds'],
    correctIndex: 3,
    explanation:
      'Sending takes 160 ÷ 20 = 8 seconds. The delay adds 100 ms, which is 0.1 seconds, so the total is 8.1 seconds. The answer 8 seconds forgets the delay. The answer 9 seconds treats 100 ms as one second. The answer 108 seconds adds 100 ms as if it were 100 seconds.',
  },
  {
    id: 'q3',
    prompt:
      'Your link is 1000 Mbps, yet each small request you send to a distant server takes about 100 ms to be answered. What is the main reason?',
    options: [
      'Each small request is mostly delay: sending a few bits takes almost no time, so the length of the road sets the wait',
      'The link needs even more bandwidth, because small requests need wide pipes',
      'Small files travel more slowly than big files',
      'The server sends its answer one bit at a time',
    ],
    correctIndex: 0,
    explanation:
      'Sending 1 kilobyte at 1000 Mbps takes about eight millionths of a second, so almost all of the 100 ms is delay. More bandwidth would not help, because the pipe is not the slow part. Small files and big files travel at the same speed along the road; the big ones have more to send. The answer does not arrive one bit at a time, because the pipe carries many bits at once.',
  },
  {
    id: 'q4',
    prompt:
      'Your plan says 100 Mbps. About how many megabytes can arrive each second, at best?',
    options: [
      '100 megabytes per second',
      '800 megabytes per second',
      '12.5 megabytes per second',
      '1.25 megabytes per second',
    ],
    correctIndex: 2,
    explanation:
      'Mbps counts megabits, and eight bits make one byte, so 100 ÷ 8 = 12.5 megabytes per second. The answer 100 forgets that a byte has eight bits. The answer 800 multiplies by 8 instead of dividing. The answer 1.25 divides by 80, which is ten times too much.',
  },
  {
    id: 'q5',
    prompt:
      'A link carries 100 Mbps and its round-trip time is 20 ms. How many bits can be on their way at the same moment (the bandwidth-delay product)?',
    options: [
      '200,000 bits',
      '2,000,000 bits',
      '20,000,000 bits',
      '100,000,000 bits',
    ],
    correctIndex: 1,
    explanation:
      '100 Mbps is 100,000,000 bits per second, and 20 ms is 0.02 seconds, so 100,000,000 × 0.02 = 2,000,000 bits. The answer 200,000 uses 0.002 seconds, which is only 2 ms. The answer 20,000,000 uses 0.2 seconds, which is 200 ms. The answer 100,000,000 is what fits in a whole second, not in 20 ms.',
  },
];
