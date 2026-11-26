import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

/** Section 2: the bus. */
export function Bus() {
  return (
    <>
      <p>
        In a bus, every device taps into one long shared cable. That cable is
        called the <Term id="backbone">backbone</Term>. Think of a single bench
        in a classroom: everyone sits on it, and whatever one person says, the
        whole bench hears.
      </p>

      <h3>How a message travels on a bus</h3>
      <p>
        A device sends its message onto the backbone as a signal. The signal
        runs both ways along the cable, so every device on the bus receives it.
        Each device checks the address on the message. The one it is meant for
        keeps it, and the others ignore it. Only one device can send at a time,
        because two signals on the same cable at once spoil each other.
      </p>
      <p>
        Each end of the backbone needs a small plug called a{' '}
        <Term id="terminator">terminator</Term>. It absorbs the signal when it
        reaches the end. Without one, the signal bounces back along the cable
        like an echo and mixes with new messages.
      </p>

      <h3>What breaks, and what it costs</h3>
      <ul>
        <li>
          <strong>Cable:</strong> very little. Five devices need one backbone
          and five short connections to it. In our drawings the backbone is
          shown in pieces, one between each pair of neighbouring devices, so
          five devices have four pieces (n &minus; 1 for n devices).
        </li>
        <li>
          <strong>If the backbone is cut:</strong> in our model, everyone stops.
          The cable is no longer terminated at the cut, so signals bounce and
          spoil the messages for every device.
        </li>
        <li>
          <strong>If one device fails:</strong> only that device drops out. The
          backbone is still whole, so the others carry on.
        </li>
        <li>
          <strong>Adding a device:</strong> tap it into the backbone. But every
          device shares the same cable, so more devices means less capacity for
          each.
        </li>
      </ul>
      <p>
        The backbone is a single point of failure, and it is hard to find where
        a bus is broken: all you see is that the whole network has stopped.
      </p>

      <h3>Where you meet a bus today</h3>
      <p>
        The bus was the shape of the first widely used Ethernet networks, in the
        1980s and early 1990s. It is historical for office and home networks
        today: new networks use a star. The idea lives on elsewhere. A car, for
        example, joins its control units with a bus cable, so that they can all
        hear each other.
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Worked example.</strong> A 1990s office has five computers on
          one bus, A to E.
        </li>
        <li>The cable gets crushed under a desk between B and C.</li>
        <li>
          Nobody on the floor can use the network until someone finds the damage
          and repairs it. If instead computer C is switched off, A, B, D and E
          carry on.
        </li>
      </ol>
    </>
  );
}

/** Go deeper: how a coax bus worked. */
export function CoaxDeeper() {
  return (
    <>
      <p>
        The classic Ethernet bus was called 10BASE2. It used thin coaxial cable,
        the kind of round cable with a copper core that also carries cable
        television. Each computer attached through a T-shaped connector. A
        terminator of 50 ohms sat at each end of the cable.
      </p>
      <p>
        One cable segment could be up to 185 metres long and hold up to 30
        devices. All of them shared 10 megabits per second. The number
        &ldquo;10&rdquo; in the name is that speed, and &ldquo;BASE&rdquo; means
        the signal is sent as it is, without being shifted onto another
        frequency.
      </p>
    </>
  );
}

/** Go deeper: the model versus a real broken bus. */
export function BusBreakDeeper() {
  return (
    <>
      <p>
        Why does our model say a cut bus stops everyone? A cut leaves two pieces
        of cable, and each piece now has one end with no terminator. Signals
        reflect at that open end and mix with the messages that follow.
        Depending on where the cut is, some computers may still manage to talk
        for a while, but the network as a whole becomes unreliable. The model
        rounds this to &ldquo;everyone stops&rdquo;, because that is what users
        noticed in practice.
      </p>
      <p>
        Another problem was devices taking turns. Two devices that sent at the
        same moment caused a collision, and both had to try again. Level 2
        explains how Ethernet handled that.
      </p>
    </>
  );
}
