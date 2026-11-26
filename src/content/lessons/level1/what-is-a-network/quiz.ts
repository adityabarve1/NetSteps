import type { QuizQuestion } from '@/content/types';

// Five questions, one per big idea of the lesson. Correct answers sit at
// positions 1, 3, 2, 1 and 0. Every explanation says why the right answer is
// right and why each other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt:
      'A laptop and a printer sit on the same desk. The printer has no cable plugged in and its wireless is turned off. Do the two form a network?',
    options: [
      'Yes, because they are in the same room',
      'No, because there is no link between them to carry data',
      'Yes, because the laptop has Wi-Fi turned on',
      'No, because a network needs at least three devices',
    ],
    correctIndex: 1,
    explanation:
      'A network needs a link that carries data between the devices, and here there is none. Being in the same room does not count: closeness is not a connection. The laptop’s Wi-Fi does not help, because the printer’s wireless is off, so nothing joins them. And two devices are enough for a network; you do not need three.',
  },
  {
    id: 'q2',
    prompt: 'Which of these devices is a host?',
    options: [
      'A switch',
      'A router',
      'A Wi-Fi access point',
      'A smart TV that streams films',
    ],
    correctIndex: 3,
    explanation:
      'A host sends and receives its own data, and a smart TV receives the films it asked for, so it is a host. A switch, a router and a Wi-Fi access point are network devices: their job is to move other devices’ data along, not to use it themselves.',
  },
  {
    id: 'q3',
    prompt:
      'PC1 is cabled to PC2, and PC2 is cabled to PC3. There is no switch. All three have addresses in the same subnet. Can PC1 send a message to PC3?',
    options: [
      'Yes, PC2 passes it on, the way a switch would',
      'Yes, because all three are in the same subnet',
      'No, an ordinary computer does not pass on messages meant for other devices',
    ],
    correctIndex: 2,
    explanation:
      'An ordinary computer keeps only the messages meant for itself, so PC2 will not pass PC1’s message on to PC3. Passing messages on is the job of a switch, not of a host like PC2. Being in the same subnet means their addresses would let them talk directly, but there still has to be a path of links and switches between them, and there is not.',
  },
  {
    id: 'q4',
    prompt:
      'With the subnet mask 255.255.255.0, which address is in the same subnet as 192.168.1.10?',
    options: ['192.168.2.10', '192.168.1.200', '10.168.1.10', '192.169.1.10'],
    correctIndex: 1,
    explanation:
      'With mask 255.255.255.0 the first three numbers are the network part. 192.168.1.200 starts with 192.168.1, the same as 192.168.1.10, so it is in the same subnet. 192.168.2.10 differs in the third number, 10.168.1.10 in the first and 192.169.1.10 in the second, so each of those is in a different subnet, even though the last number matches in two of them.',
  },
  {
    id: 'q5',
    prompt:
      'Your phone shows full Wi-Fi bars, but no websites will load. What is the most likely explanation?',
    options: [
      'The phone’s Wi-Fi link to the home router box works, but the connection from your home to the internet is down',
      'Wi-Fi and the internet are the same thing, so the bars must be wrong',
      'Websites need a cable, so they cannot load over Wi-Fi',
      'The web is the whole internet, so the entire internet must be down',
    ],
    correctIndex: 0,
    explanation:
      'Wi-Fi is only the wireless link between the phone and the access point in your home, so full bars say that link is fine while the line from your home to the internet provider can still be down. Wi-Fi is not the internet, so the bars can be right and the internet still unreachable. Websites load over Wi-Fi every day, so a cable is not needed. And the web is one service on the internet, not the whole of it; a fault at home is far more likely than the whole internet failing.',
  },
];
