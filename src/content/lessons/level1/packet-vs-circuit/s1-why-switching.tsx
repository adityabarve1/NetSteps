import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

const ROWS = [
  { devices: 4, links: '6' },
  { devices: 10, links: '45' },
  { devices: 100, links: '4,950' },
  { devices: 1000, links: '499,500' },
];

/** Section 1: why a network needs a switching method. */
export function WhySwitching() {
  return (
    <>
      <p>
        When you call a friend or open a web page, your data crosses many
        devices that you never see. Something decides which way it goes at each
        step. This lesson is about the two main ways networks have solved that
        problem, and why the internet chose one of them.
      </p>

      <h3>The problem: too many devices for too many cables</h3>
      <p>
        Suppose every device had its own cable to every other device. Four
        devices need 6 cables. That is fine. But the count grows much faster
        than the number of devices:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            Cables needed if every device is wired to every other device
          </caption>
          <thead>
            <tr>
              <th scope="col">Devices</th>
              <th scope="col">Cables</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.devices}>
                <th scope="row">{r.devices.toLocaleString('en-US')}</th>
                <td data-label="Cables">{r.links}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        A thousand devices would need almost half a million cables, and nobody
        can build that. Worse, every new device would need a new cable to every
        old one.
      </p>

      <h3>The answer: share the middle</h3>
      <p>
        Instead, each device has one <Term id="link">link</Term> to a nearby
        device that sits in the middle, and the middle devices are linked to one
        another. A <Term id="router">router</Term> is one kind of middle device.
        Your message hops from link to link through them until it reaches the
        other side. The path it takes is called a <Term id="route">route</Term>.
      </p>
      <p>
        Sharing the middle saves cables, but it creates a new question. Many
        conversations want to use the same links at the same time. How should
        the network divide them up? The rule a network follows for this is its{' '}
        <strong>switching method</strong>: how data gets from sender to receiver
        through the shared middle.
      </p>

      <h3>Two big families</h3>
      <ul>
        <li>
          <strong>Circuit switching</strong>: before talking, the network
          reserves a path for you and keeps it for the whole conversation. The
          old telephone network worked this way.
        </li>
        <li>
          <strong>Packet switching</strong>: you cut your message into small
          pieces, and each piece finds its own way, sharing the links with
          everyone else. The internet works this way.
        </li>
      </ul>
      <p>Notice three things before we go on:</p>
      <ul>
        <li>
          Neither method is &ldquo;the right one&rdquo;. Each trades one good
          thing for another, and you will see exactly what.
        </li>
        <li>
          The difference is about <em>sharing</em>: a reserved path is yours
          alone, and a shared path is used by many at once.
        </li>
        <li>
          Real networks sometimes mix ideas from both, which later sections
          show.
        </li>
      </ul>
      <p className={styles.note}>
        &ldquo;Switching&rdquo; here means passing data on through the devices
        in the middle. It is a general idea, and not the same thing as the
        device called a switch. The first Go deeper block explains the
        difference.
      </p>
    </>
  );
}

/** Go deeper: where the cable count comes from. */
export function CableCountDeeper() {
  return (
    <>
      <p>
        With <em>n</em> devices, each one needs a cable to the other <em>n</em>{' '}
        − 1 devices. That counts every cable twice, once from each end, so the
        number of cables is <em>n</em> × (<em>n</em> − 1) ÷ 2. For 10 devices
        that is 10 × 9 ÷ 2 = 45.
      </p>
      <p>
        A network where every device links to every other is called a full mesh.
        You met it in the lesson on topologies, where a partial mesh was a
        cheaper compromise. Big networks go further and use a few shared links
        for many users, which is exactly what switching methods make possible.
      </p>
    </>
  );
}

/** Go deeper: two meanings of the word. */
export function SwitchWordDeeper() {
  return (
    <>
      <p>
        Engineers use the word &ldquo;switching&rdquo; in two ways. In this
        lesson it is the general idea of moving data through shared devices
        toward its destination, and it covers routers as well.
      </p>
      <p>
        A device called a <em>switch</em> is a specific kind of equipment,
        common inside a local network, that passes data between the computers
        plugged into it. Such a switch also works with small pieces of data, so
        it belongs to the packet family. The lesson on switches in Level 2
        covers how it works.
      </p>
    </>
  );
}
