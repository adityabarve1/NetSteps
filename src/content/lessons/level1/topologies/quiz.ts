import type { QuizQuestion } from '@/content/types';

// Five questions: a star failure, a ring failure, the mesh cable count, a bus
// failure and the home network. Correct answers sit at positions 1, 3, 0, 2
// and 1. Every explanation says why the right answer is right and why each
// other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt:
      'Five computers, A to E, are joined in a star around one switch. The cable between computer C and the switch is cut. Which computers can still talk to each other?',
    options: [
      'None of them, because every message goes through the switch',
      'A, B, D and E, but not C',
      'Only C and the switch',
      'All five, because the switch finds another route to C',
    ],
    correctIndex: 1,
    explanation:
      'Each computer has its own cable, so the cut cuts off only C. A, B, D and E still reach the switch and each other. The switch is still working, so the claim that none can talk is wrong. C has no cable left, so C cannot talk to anyone. And C had only one cable, so the switch has no other route to it.',
  },
  {
    id: 'q2',
    prompt:
      'Five devices are joined in a single ring. One of the five links between neighbouring devices is cut. What happens?',
    options: [
      'Only the two devices beside the cut lose contact',
      'The ring sends the traffic along a spare cable',
      'Nothing changes, because a ring is the most reliable shape',
      'No device can talk to another, because messages cannot get past the break',
    ],
    correctIndex: 3,
    explanation:
      'In a single ring, messages must pass from neighbour to neighbour round the whole loop. A break blocks that, so in our model everyone stops. It is not only the two devices beside the cut, because the others also need the broken link. A single ring has no spare cable. And the mesh, not the ring, is the shape that survives breaks.',
  },
  {
    id: 'q3',
    prompt:
      'You want every one of 6 devices to have its own direct cable to every other device. How many cables do you need?',
    options: ['15', '30', '6', '36'],
    correctIndex: 0,
    explanation:
      'Each of the 6 devices needs 5 cables, which makes 6 × 5 = 30 cable ends. A cable has two ends, so there are 30 / 2 = 15 cables. The answer 30 counts every cable twice. The answer 6 is one cable per device, which is a star, not a mesh. The answer 36 counts a cable from each device to itself.',
  },
  {
    id: 'q4',
    prompt:
      'Five computers share one bus cable. Computer D is switched off. Can computers A and E still talk to each other?',
    options: [
      'No, because a switched-off computer blocks the backbone',
      'No, because messages from A to E must pass through D',
      'Yes, because the backbone is still whole and D only removes itself',
    ],
    correctIndex: 2,
    explanation:
      'A bus message travels along the backbone, and a switched-off computer only drops out. The cable is untouched, so A and E still talk. A switched-off computer does not block the cable. Messages also do not pass through the computers on a bus. They travel along the backbone, so D is not in the way.',
  },
  {
    id: 'q5',
    prompt:
      'At home, a laptop and a phone (both on Wi-Fi) and a games console (on a cable) are each joined to your router. What shape is this network, and what is its single point of failure?',
    options: [
      'A bus, and the longest cable',
      'A star, and the router in the middle',
      'A ring, and any device',
      'A mesh, and nothing, because Wi-Fi has no cables',
    ],
    correctIndex: 1,
    explanation:
      'Every device has its own link to the router, which is a star. If the router fails, all three lose the network. It is not a bus, because the devices do not share one cable. It is not a ring, because they are not joined in a loop. It is not a mesh, because every link leads to the router. That makes the router a single point of failure. Wi-Fi links count as links too.',
  },
];
