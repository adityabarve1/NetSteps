import type { QuizQuestion } from '@/content/types';

// Five questions: a PAN scenario, a MAN scenario, the internet, a private
// address, and the rules of thumb. Correct answers sit at positions 2, 1, 3, 0
// and 2. Every explanation says why the right answer is right and why each
// other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt:
      'You join your laptop to your phone with a USB cable, so the laptop can use the phone’s mobile data. What is the best name for the small network of the laptop, the cable and the phone?',
    options: ['LAN', 'MAN', 'PAN', 'WAN'],
    correctIndex: 2,
    explanation:
      'It is a PAN. Both devices are within your reach, a metre or less apart, around one person. A LAN covers a place such as a home or an office, up to about 2 kilometres. A MAN covers a city. A WAN joins places that are far apart. This cable is far too short for any of those.',
  },
  {
    id: 'q2',
    prompt:
      'A firm links its three offices with its own network. All three are in one city, about 10 km apart. By the rules of thumb in this lesson, what is the network?',
    options: [
      'A LAN, because every office has a LAN',
      'A MAN, because it is the size of a city',
      'A WAN, because it joins several sites',
      'A PAN, because one firm owns it',
    ],
    correctIndex: 1,
    explanation:
      'It is a MAN: 10 km is above the 2 km limit of a LAN and well below 100 km. Each office does have its own LAN, but the network that joins them is bigger. Joining several sites does not make a WAN: a WAN is for places far apart, over about 100 km. Who owns the network does not make it a PAN. A PAN is built around one person.',
  },
  {
    id: 'q3',
    prompt: 'Which sentence about the internet is the most accurate?',
    options: [
      'It is one very large LAN that covers the world',
      'It is one WAN that belongs to a single company',
      'It is the same thing as the web',
      'It is a network of networks, made of many LANs and WANs',
    ],
    correctIndex: 3,
    explanation:
      'The internet joins many separate networks, including LANs and WANs, run by thousands of organisations. It is not one LAN, because it is not one place run by one owner. It is not one WAN owned by a single company, because no single company owns it. And the web is only one service that runs on the internet.',
  },
  {
    id: 'q4',
    prompt:
      'Your computer’s IP address is 192.168.0.14. What does this most likely tell you?',
    options: [
      'It is a private address, used inside a LAN such as a home network',
      'It is a public address, so the computer is directly on the internet',
      'It is a WAN address, used only on long-distance lines',
    ],
    correctIndex: 0,
    explanation:
      'Addresses that start with 192.168 are one of the three private ranges, which networks use inside a LAN. So your computer is most likely on a home-style LAN. It is not a public address, because private addresses are not used on the public internet. And there is no separate address range for WANs; the first numbers do not show distance.',
  },
  {
    id: 'q5',
    prompt:
      'One book says a LAN reaches up to 1 km. Another says up to 2 km. Why do the books disagree?',
    options: [
      'Each country defines LAN in its own law',
      'LANs grew bigger after Wi-Fi was invented',
      'The limits are rules of thumb, not an official standard',
      'One of the books must be wrong',
    ],
    correctIndex: 2,
    explanation:
      'No official standard fixes the distance limits. They are rules of thumb, so authors pick slightly different numbers. No country defines LAN in law. Wi-Fi does not set a number either. And neither book has to be wrong: both are giving a guess, not a fact.',
  },
];
