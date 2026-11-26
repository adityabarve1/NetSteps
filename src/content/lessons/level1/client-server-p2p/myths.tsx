import type { ReactNode } from 'react';
import styles from './lesson.module.css';

type Myth = { myth: string; fact: ReactNode };

const MYTHS: Myth[] = [
  {
    myth: 'A server is a special kind of computer.',
    fact: 'A server is a role. Machines built for the job have backup power and spare parts, but any computer that runs a server program is acting as a server while the program runs.',
  },
  {
    myth: 'Clients never talk to each other.',
    fact: 'In plain client-server, clients talk to the server. But nothing forbids direct contact. Peer-to-peer designs and many video-call apps send data straight between devices when they can.',
  },
  {
    myth: 'Peer-to-peer is always faster.',
    fact: 'It depends. With one computer there is no gain, and if the peers upload slowly the result is close to client-server. In our model the time for 10 peers is 40 seconds against 80 only because each peer uploads 10 Mbps.',
  },
  {
    myth: 'A well-known website is one computer.',
    fact: 'A busy service runs on many servers, usually in several places. You ask one address, and the service decides which server answers.',
  },
  {
    myth: 'Adding more clients only slows the server a little.',
    fact: 'Once the server’s upload is the bottleneck, the time grows in step with the clients. Twice the clients means twice the wait in our example.',
  },
  {
    myth: 'Peer-to-peer means illegal downloads.',
    fact: 'P2P is a technique, and it is used by some ordinary software. Whether sharing is legal depends on what is shared and whether the owner allows it, not on the technique.',
  },
];

/** Myth and Fact cards. */
export function Myths() {
  return (
    <ul className={styles.myths}>
      {MYTHS.map((m) => (
        <li key={m.myth}>
          <p>
            <span className={styles.label}>Myth:</span> {m.myth}
          </p>
          <p>
            <span className={styles.label}>Fact:</span> {m.fact}
          </p>
        </li>
      ))}
    </ul>
  );
}
