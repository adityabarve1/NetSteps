import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Case = { network: string; physical: string; logical: string };

const CASES: Case[] = [
  {
    network: 'Classic coax Ethernet',
    physical: 'Bus',
    logical: 'Bus',
  },
  {
    network: 'Ethernet with a hub',
    physical: 'Star',
    logical: 'Bus (the hub repeats every message to every socket)',
  },
  {
    network: 'Token Ring',
    physical: 'Star (cables to a central box)',
    logical: 'Ring',
  },
  {
    network: 'Home network with a router',
    physical: 'Star',
    logical: 'Star: messages go through the router or switch',
  },
];

const MYTHS: { myth: string; fact: string }[] = [
  {
    myth: 'A star network cannot fail.',
    fact: 'One cable fails alone, but the switch in the middle is a single point of failure. Important networks add a spare switch.',
  },
  {
    myth: 'Big networks are meshes, small ones are stars.',
    fact: 'Real networks combine shapes. A building is often a star of stars, and the internet is a partial mesh of many such networks.',
  },
  {
    myth: 'Home Wi-Fi is a mesh.',
    fact: 'A normal Wi-Fi network is a star around one access point or router. Only Wi-Fi systems with extra boxes that relay for each other form a mesh.',
  },
  {
    myth: 'A topology diagram shows where things are and how long the cables are.',
    fact: 'It shows only which devices are joined to which. Two networks with the same diagram can have very different cable lengths.',
  },
  {
    myth: 'A ring means the cables run in a circle.',
    fact: 'A ring is about how messages travel. Token Ring cables ran in a star to a central box, while the messages went round a ring inside it.',
  },
];

/** Section 7: physical versus logical topology, and common mix-ups. */
export function LogicalVsPhysical() {
  return (
    <>
      <p>
        So far we drew the shape of the cables. There are two ways to describe a
        network&rsquo;s shape, and they can differ. The{' '}
        <Term id="physical-topology">physical topology</Term> is how the devices
        and cables are actually laid out. You could photograph it. The{' '}
        <Term id="logical-topology">logical topology</Term> is how messages flow
        from device to device. You cannot photograph it, but you can trace it.
      </p>

      <h3>Same cables, different flow</h3>
      <p>
        The seating plan from the start of the lesson works here too: the chairs
        can stand in a row while the people pass notes round in a circle. The
        table shows real networks where the two shapes differ.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Physical and logical shape of some networks</caption>
          <thead>
            <tr>
              <th scope="col">Network</th>
              <th scope="col">Physical shape</th>
              <th scope="col">Logical shape</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => (
              <tr key={c.network}>
                <th scope="row">{c.network}</th>
                <td data-label="Physical shape">{c.physical}</td>
                <td data-label="Logical shape">{c.logical}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The hub row explains why the shapes matter separately. A hub-based
        network is wired as a star, so one broken cable hurts only one device.
        But because the hub repeats every message to every socket, all devices
        still share one stream of traffic, as on a bus.
      </p>
      <p>
        Which one does a failure follow? The failure rules in this lesson depend
        on the physical layout (what can be cut). How crowded the network gets
        depends on the logical layout (who hears whose messages).
      </p>

      <h3>Common mix-ups</h3>
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

/** Go deeper: hybrid topologies. */
export function HybridDeeper() {
  return (
    <>
      <p>
        A topology that mixes shapes is called a hybrid. A company might wire
        each floor as a star, join the floor switches to each other in a ring
        for protection, and join its offices in different cities with a partial
        mesh of leased lines. When you read a network diagram, look for these
        building blocks and ask the lesson&rsquo;s three questions of each part:
        how much cable, what breaks, how hard is it to grow.
      </p>
    </>
  );
}

/** Go deeper: Wi-Fi as a shared medium. */
export function WifiDeeper() {
  return (
    <>
      <p>
        Wi-Fi shows both views at once. Physically, your devices and the access
        point form a star: every device has its own wireless link to the access
        point, and the access point is the single point of failure.
      </p>
      <p>
        But radio waves spread in every direction, so all devices on the same
        channel share the same radio space and must take turns, much as devices
        on a bus shared one cable. That sharing is part of the logical picture.
        Level 2 explains how devices take turns.
      </p>
    </>
  );
}
