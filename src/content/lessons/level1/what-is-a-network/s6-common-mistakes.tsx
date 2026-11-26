import type { ReactNode } from 'react';
import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Myth = { myth: string; fact: ReactNode };

const MYTHS: Myth[] = [
  {
    myth: 'The internet and the web are the same thing.',
    fact: (
      <>
        The internet is the network: the cables, routers and devices that carry
        data. <Term id="web">The web</Term> is one service that runs on it: the
        pages you open in a browser. Email, video calls and online games use the
        internet too, but they are not the web.
      </>
    ),
  },
  {
    myth: 'Wi-Fi is the internet.',
    fact: 'Wi-Fi is only the wireless link between your device and the access point in your home. You can have full Wi-Fi bars and no internet, when the line from your home to the provider is down. And you can still print over Wi-Fi with no internet at all.',
  },
  {
    myth: 'A network needs the internet.',
    fact: 'Two laptops and a switch, with no internet connection, are a complete network. They can share files and a printer. The internet is one huge network that your network can join.',
  },
  {
    myth: 'Devices in the same room are on the same network.',
    fact: 'Being close does not count. Devices are on a network only when a link joins them. Your neighbour’s laptop may be a metre away through the wall and on a completely different network.',
  },
  {
    myth: 'Any computer will pass messages along.',
    fact: 'An ordinary computer keeps only the messages meant for itself. Switches and routers are the devices that pass messages on.',
  },
  {
    myth: 'A switch and a router are the same thing.',
    fact: 'A switch joins devices inside one network. A router joins different networks. At home they share one box, which is why people mix them up.',
  },
  {
    myth: 'A device keeps the same IP address forever.',
    fact: 'A device usually gets its IP address from the network it joins, so the address can change. Your laptop gets one address at home and a different one in a café. A device with two adapters, such as Wi-Fi and a cable, can even have two addresses at once.',
  },
];

/** Section 6: real misconceptions, each with the fact that replaces it. */
export function CommonMistakes() {
  return (
    <>
      <p>
        These mix-ups are very common, even among people who use networks every
        day. Each one comes with the fact that replaces it.
      </p>
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
    </>
  );
}

/** Go deeper: the same ideas as a first troubleshooting checklist. */
export function TroubleshootingDeeper() {
  return (
    <>
      <p>
        When one device cannot reach another, network engineers check the parts
        of a network in order, from the bottom up. You can already do the same:
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Is there a link?</strong> Is the cable plugged in at both
          ends, or is Wi-Fi connected? Without a link, nothing travels.
        </li>
        <li>
          <strong>Is there a path?</strong> Is every device in between, such as
          the switch, switched on and cabled? A plain computer in the middle
          does not count.
        </li>
        <li>
          <strong>Do both ends have addresses?</strong> A device with no IP
          address cannot take part in IP messages, such as a ping.
        </li>
        <li>
          <strong>Are they in the same subnet?</strong> If not, a router must
          join the two subnets.
        </li>
        <li>
          <strong>Is each address unique?</strong> Two devices with the same
          address confuse the network.
        </li>
      </ol>
      <p>
        These are the usual reasons a ping fails in the lab, too. Try them
        there: break one thing at a time and ping again.
      </p>
    </>
  );
}
