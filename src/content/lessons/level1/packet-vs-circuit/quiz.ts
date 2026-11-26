import type { QuizQuestion } from '@/content/types';

// Five questions, one per big idea of the lesson. Correct answers sit at
// positions 2, 0, 3, 1 and 2. Every explanation says why the right answer is
// right and why each other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which sentence describes circuit switching?',
    options: [
      'Messages are cut into numbered pieces, and each piece finds its own way',
      'Each router stores the whole message and then passes it on',
      'A path is reserved for the whole conversation before any data is sent',
      'Every device is joined to every other device by its own cable',
    ],
    correctIndex: 2,
    explanation:
      'Circuit switching sets up a reserved path first and holds it for the whole conversation. Numbered pieces that find their own way describe packet switching. Storing the whole message at each router is message switching. A cable between every pair of devices is a full mesh, which avoids switching but needs far too many cables.',
  },
  {
    id: 'q2',
    prompt:
      'A message of 3500 bytes is sent with at most 1000 bytes in each packet. How many packets does it need?',
    options: ['4 packets', '3 packets', '5 packets', '3.5 packets'],
    correctIndex: 0,
    explanation:
      'Three full packets carry 3000 bytes, and the last 500 bytes need a fourth, shorter packet. Three packets would leave 500 bytes behind. Five is too many, because a header is part of each packet and never needs a packet of its own. Half a packet cannot be sent, so you round up.',
  },
  {
    id: 'q3',
    prompt:
      'Packets 1 to 3 of a message have arrived when a link on their route breaks, and another route exists. What happens to packets 4 to 6?',
    options: [
      'The whole message is lost, because a link it used has failed',
      'The packets wait at the sender until the link is repaired',
      'The sender must set up a new reserved path before it sends anything more',
      'Routers can send the remaining packets by the other route',
    ],
    correctIndex: 3,
    explanation:
      'Each packet is handled on its own, so routers can send the rest by another route. The message is not lost, because the packets that arrived are safe and the others can detour. Packets do not wait for a repair when a route exists. A new reserved path is what a circuit needs, not packets.',
  },
  {
    id: 'q4',
    prompt:
      'A message of 8000 bits is sent as 1000-bit packets over 3 links in a row. Each link runs at 1000 bits per second. About how long does it take?',
    options: ['24 seconds', '10 seconds', '8 seconds', '11 seconds'],
    correctIndex: 1,
    explanation:
      'There are 8 packets and 3 links, so (8 + 3 − 1) × 1 second = 10 seconds. The first packet needs 3 seconds, and each of the other 7 follows one second behind. 24 seconds is the time if the whole message is stored at each of the 3 links. 8 seconds is the time over a single link. 11 seconds counts one packet time too many.',
  },
  {
    id: 'q5',
    prompt:
      'Web traffic comes in short bursts with long pauses. Why does packet switching share a link well for it?',
    options: [
      'Packets are always faster than circuits on every link',
      'Packets never have to wait in a queue at a router',
      'Nothing is reserved, so capacity one user leaves idle can carry another user’s packets',
      'A packet network never loses data',
    ],
    correctIndex: 2,
    explanation:
      'With nothing reserved, the quiet moments of one user are used by others. Packets are not always faster, because every hop can add waiting. They do wait in queues when a link is busy. And they can be dropped when a queue is full, so the computers at the ends send them again.',
  },
];
