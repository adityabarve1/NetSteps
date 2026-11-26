import type { QuizQuestion } from '@/content/types';

// Five questions, one per big idea of the lesson. Correct answers sit at
// positions 1, 2, 0, 3 and 1. Every explanation says why the right answer is
// right and why each other option is not.
export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    prompt:
      'A friend runs a small web server program on their own laptop. You open its page in your browser. Which statement is true?',
    options: [
      'It cannot be a server, because servers must be special machines in a data centre',
      'Their laptop acts as the server, and your browser is the client',
      'Your browser is the server, because you asked first',
      'Both devices are peers, because both are ordinary computers',
    ],
    correctIndex: 1,
    explanation:
      'Client and server are roles. The laptop runs a server program and answers, so it is the server for this conversation. Your browser asks, so it is the client. Special machines are not required, which rules out the data centre option. Asking first makes you the client, not the server. And both being ordinary computers does not make them peers: peers each ask and answer for each other.',
  },
  {
    id: 'q2',
    prompt:
      'One server uploads at 100 Mbps. Ten clients each download an 800-megabit file at up to 50 Mbps. How long until all ten have the whole file?',
    options: ['16 seconds', '40 seconds', '80 seconds', '160 seconds'],
    correctIndex: 2,
    explanation:
      'The server must send 10 × 800 = 8000 megabits at 100 Mbps, which is 80 seconds. A single client downloads in 800 ÷ 50 = 16 seconds, so the clients are not the limit. 16 seconds is the time for one client. 40 seconds is the time for five clients. 160 seconds is what twenty clients would need.',
  },
  {
    id: 'q3',
    prompt:
      'At a school, the only file server loses power. The computers and the switch work, but nobody can open their files. What does this show?',
    options: [
      'The server is a single point of failure: when it stops, the service stops for everyone',
      'The students’ computers need new addresses before they can reach the server',
      'The switch must be broken, because switches store the files',
      'The school has too many clients, so it needs a faster switch',
    ],
    correctIndex: 0,
    explanation:
      'With one server, its failure stops the service for every client. That is a single point of failure. The computers worked until the server lost power and nothing changed for their addresses, so addresses are not the problem. The switch works too, and a switch only passes data along; it does not store files. Too many clients would slow a server down, not stop it at once, and a faster switch cannot bring back a server with no power.',
  },
  {
    id: 'q4',
    prompt:
      'Why does a peer-to-peer download usually cope better than client-server as more computers join?',
    options: [
      'Peers always have faster internet connections than servers',
      'Peers do not need to download the file at all',
      'Joining peers make the server’s own connection faster',
      'Each new peer also uploads, so the total upload available grows with the group',
    ],
    correctIndex: 3,
    explanation:
      'Every new peer brings its own upload speed, so supply grows along with demand. A server’s upload speed stays the same however many clients ask. Peers do not always have faster connections: often they upload slowly. They still have to download the file, because that is what they want. And a joining peer does not change the server’s own connection speed.',
  },
  {
    id: 'q5',
    prompt:
      'A video app uses servers to keep accounts and to help two friends find each other. When it can, it then sends the video straight between their phones. How should you describe it?',
    options: [
      'Pure client-server, because servers are involved',
      'A hybrid: servers do some jobs and peers do others',
      'Pure peer-to-peer, because the video goes between phones',
      'Neither, because video calls cannot use these designs',
    ],
    correctIndex: 1,
    explanation:
      'Servers handle accounts and introductions, and the phones carry the video. That mix is a hybrid. It is not pure client-server, because the video does not pass through a server. It is not pure peer-to-peer, because servers do real work. And these designs do not forbid video calls: many real apps combine them.',
  },
];
