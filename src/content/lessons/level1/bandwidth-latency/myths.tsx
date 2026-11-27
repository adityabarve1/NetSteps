import type { ReactNode } from 'react';
import styles from './lesson.module.css';

type Myth = { myth: string; fact: ReactNode };

const MYTHS: Myth[] = [
  {
    myth: 'Bandwidth is the speed of the internet.',
    fact: 'Bandwidth is how much a link can carry each second. How long a transfer takes depends on that and on the latency. Two links with the same bandwidth can feel very different.',
  },
  {
    myth: 'A faster plan lowers my ping.',
    fact: 'A bigger plan widens the pipe. It does not shorten the road, so the ping to a far server stays about the same. One exception: if your link is so busy that messages wait in queues, more bandwidth can shorten the queues and lower the ping.',
  },
  {
    myth: 'Mbps and MBps are the same.',
    fact: 'Mbps is megabits per second and MBps (or MB/s) is megabytes per second. A byte is eight bits, so 100 Mbps is at most 12.5 megabytes per second.',
  },
  {
    myth: 'Latency is only about distance.',
    fact: 'Distance sets a minimum, but queues, slow devices, busy Wi-Fi and the time to push data onto the link all add to it.',
  },
  {
    myth: 'Ping tells me my download speed.',
    fact: 'Ping times one tiny message there and back. It reports latency. It says almost nothing about how much data the link can carry.',
  },
  {
    myth: 'More bandwidth always makes things faster.',
    fact: 'It helps when there is a lot to send. For many small requests, the waiting dominates and a wider pipe changes almost nothing.',
  },
  {
    myth: 'For both numbers, bigger is better.',
    fact: 'Higher bandwidth is better, but lower latency is better. A latency of 10 ms beats one of 200 ms.',
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
