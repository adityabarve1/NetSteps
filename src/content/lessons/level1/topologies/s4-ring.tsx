import styles from './lesson.module.css';

/** Section 4: the ring. */
export function Ring() {
  return (
    <>
      <p>
        In a ring, the devices are joined in a closed loop. Each device has
        exactly two neighbours, one on each side. Picture children passing a
        note around a circle: each child reads it, and if it is not for them,
        hands it to the next child.
      </p>

      <h3>How a message travels round a ring</h3>
      <p>
        A device sends its message to a neighbour. That neighbour checks the
        address. If the message is for it, it keeps it. If not, it passes the
        message on to the next device, and so on round the loop. Each device
        repeats the message for the others, so every device in a ring does a
        little of the work of a network device.
      </p>
      <p>
        In a ring that sends one way only, the direction matters. With five
        devices A to E, a message from A to C goes through B: two links. A
        message from C to A must go on round through D and E: three links.
      </p>

      <h3>What breaks, and what it costs</h3>
      <ul>
        <li>
          <strong>Cable:</strong> one link per device. Five devices need five
          links (n links for n devices), and each device needs two sockets.
        </li>
        <li>
          <strong>If one link is cut:</strong> in a single ring, everyone stops.
          The messages can no longer get past the break, and there is no other
          way round.
        </li>
        <li>
          <strong>If one device fails:</strong> in a single ring, everyone stops
          too. That device was passing messages along, so the loop is broken at
          that point.
        </li>
        <li>
          <strong>Adding a device:</strong> open the ring at one point, put the
          new device in the gap, and close the ring. The network is down while
          you do it.
        </li>
      </ul>
      <p>
        A <em>single</em> ring has no spare route, so it has many single points
        of failure: every link and every device. That is the main weakness. The
        Go deeper blocks show how real rings fix it.
      </p>

      <h3>Where you meet a ring today</h3>
      <p>
        Rings were used in office networks in the 1980s and 1990s, and they are
        rare there today. Rings are still common for fibre cables that join
        cities and telephone exchanges, where a second path is added to protect
        the ring.
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Worked example.</strong> Five devices are in a one-way ring, A
          to E, and A sends to C.
        </li>
        <li>The message goes A to B to C: two links, and C receives it.</li>
        <li>
          Now the link between B and C is cut. The message reaches B but cannot
          cross to C. Many other messages need that link too, and a single ring
          has no other way round, so we say nobody can talk.
        </li>
      </ol>
    </>
  );
}

/** Go deeper: how real rings worked. */
export function TokenRingDeeper() {
  return (
    <>
      <p>
        IBM&rsquo;s Token Ring (standard name IEEE 802.5) ran at 4 or 16
        megabits per second. A small message called a token travelled round the
        ring. A device could send only when it held the token, so devices took
        turns and never collided. FDDI, a ring of optical fibre at 100 megabits
        per second, worked in a similar way.
      </p>
      <p>
        Token Ring was cabled in an unusual way. Each computer had a cable to a
        central box called a multistation access unit, and the ring ran inside
        that box. So the cabling was a star, while the messages travelled in a
        ring. The last section explains this difference between the physical and
        the logical shape.
      </p>
    </>
  );
}

/** Go deeper: dual rings. */
export function DualRingDeeper() {
  return (
    <>
      <p>
        FDDI used <em>two</em> rings that carried data in opposite directions.
        When one link broke, the two devices beside the break joined the rings
        together, so the traffic wrapped round the break and the network carried
        on as one longer ring. Telephone and city fibre rings use the same idea
        of a second path.
      </p>
      <p>
        That protection has limits. A second break splits the network into two
        separate pieces. Our lesson&rsquo;s &ldquo;single ring&rdquo; has no
        second path, which is why one break stops everyone. A ring of routers
        that can send messages either way round also survives one break: it
        behaves like a small partial mesh, which the next section describes.
      </p>
    </>
  );
}
