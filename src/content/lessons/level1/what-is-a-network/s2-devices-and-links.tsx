import { Term } from '@/content/components/Term';
import { JourneySim } from './sim';
import styles from './lesson.module.css';

/** Section 2: devices, links, and the primary simulation. */
export function DevicesAndLinks() {
  return (
    <>
      <p>
        Every network, from two laptops to the whole internet, is built from
        only two kinds of thing: <strong>devices</strong> and{' '}
        <strong>links</strong>.
      </p>

      <h3>Devices</h3>
      <p>
        A device is any machine that connects to the network. Laptops, phones,
        printers, smart TVs, games consoles and smart speakers are all devices.
        Some devices exist only to help the others talk. You will meet those in
        a moment.
      </p>
      <p>
        Each device connects through a{' '}
        <Term id="network-adapter">network adapter</Term>: the part that sends
        and receives signals. On a laptop, that might be the socket for a cable,
        the Wi-Fi radio inside, or both. A device with two adapters can use two
        connections at once.
      </p>

      <h3>Links</h3>
      <p>
        A <Term id="link">link</Term> is the connection that carries data
        between two devices. Links come in two families:
      </p>
      <ul>
        <li>
          <strong>Wired links</strong> use a cable. Most home and office cables
          are <Term id="ethernet">Ethernet</Term> cables, which carry electrical
          signals along copper wires. Fibre-optic cables carry flashes of light
          through thin strands of glass, and reach much further.
        </li>
        <li>
          <strong>Wireless links</strong> use radio waves through the air. Wi-Fi
          joins laptops and phones to a home network. Bluetooth joins earbuds to
          a phone. Mobile networks such as 4G and 5G join your phone to a nearby
          phone mast.
        </li>
      </ul>
      <p>
        Whatever the link, the idea is the same. The sending device turns data
        into a signal: a changing voltage, flashes of light, or a radio wave.
        The receiving device turns that signal back into data. Nothing else
        travels along the link.
      </p>

      <h3>Watch a message cross a small network</h3>
      <p>
        Here is a small network with a helper in the middle. Two computers, PC1
        and PC2, are each joined by a cable to a <Term id="switch">switch</Term>
        . A switch is a box with many sockets. It joins the devices plugged into
        it and passes each message toward the device it is for. Step through the
        trip with <strong>Next</strong>, or press <strong>Play</strong>.
      </p>
      <JourneySim />
      <p>Notice three things:</p>
      <ul>
        <li>
          The message only moved along links. It cannot jump across empty space.
        </li>
        <li>
          PC1 has no cable to PC2, yet it reached PC2. The switch joined them.
          That is how one switch can link a whole room of computers with one
          cable each.
        </li>
        <li>
          The switch did not keep the message. It passed it on. PC2, the device
          it was for, received it.
        </li>
      </ul>
      <p className={styles.note}>
        In this lesson a message is one item travelling as a whole. That is a
        simplification for now. Real networks cut longer messages into small
        pieces called <Term id="packet">packets</Term>, and the lesson on packet
        and circuit switching shows why.
      </p>
    </>
  );
}

/** Go deeper: wired versus wireless. */
export function WiredWirelessDeeper() {
  return (
    <>
      <p>Neither kind of link is simply better. Each one trades something.</p>
      <ul>
        <li>
          <strong>Wired</strong> links are usually faster and steadier. Other
          devices nearby do not disturb them. A standard copper Ethernet cable
          can be up to 100 metres long. Fibre can run for many kilometres, which
          is why it carries data between cities and under oceans.
        </li>
        <li>
          <strong>Wireless</strong> links let you move around and need no cable
          run. But every Wi-Fi network nearby shares the same radio space, and
          walls and distance weaken the signal. Indoors, Wi-Fi usually reaches a
          few tens of metres.
        </li>
      </ul>
      <p>
        Most homes use both. The internet connection usually reaches the house
        by a copper wire or a fibre, and inside, the phones and laptops join by
        Wi-Fi.
      </p>
    </>
  );
}

/** Go deeper: how a switch knows which way to send. */
export function SwitchLearningDeeper() {
  return (
    <>
      <p>
        In the simulation, the switch seems to know which socket leads to PC2.
        For now, that is all you need. A real switch is not told this. It
        learns.
      </p>
      <p>
        Every message carries the hardware address of the adapter that sent it.
        When a message arrives, the switch notes which socket it came in on.
        Over time it builds a table: &ldquo;this address is on socket 3&rdquo;.
      </p>
      <p>
        Until it has learned where a device is, the switch sends the message out
        of every other socket. Each device checks the address and only the one
        it is meant for keeps it. In Level 2 you will watch a switch fill in its
        table, step by step.
      </p>
    </>
  );
}
