import { Term } from '@/content/components/Term';
import { PacketAnatomyDiagram } from './diagrams';
import styles from './lesson.module.css';
import { splitIntoPackets } from './logic';

// Worked out by the same function the quiz and the lab rely on.
const EXAMPLE = splitIntoPackets(3500, 1000);

/** Section 3: packets. */
export function Packets() {
  return (
    <>
      <p>
        Think of a long letter that you cannot post in one envelope. You tear it
        into numbered postcards and post them one at a time. Each postcard has
        the address on it, so the post office can handle it alone. At the other
        end, your friend puts the postcards in order and reads the letter. That
        is the idea of <Term id="packet-switching">packet switching</Term>, and
        the postcards are <Term id="packet">packets</Term>.
      </p>

      <h3>What a packet is made of</h3>
      <PacketAnatomyDiagram />
      <p>
        A packet has two parts. The <Term id="header">header</Term> is the
        label: who sent the packet, who should get it, and which piece of the
        message it is. The <Term id="payload">payload</Term> is the piece of the
        message itself. Routers read the header to decide where to send the
        packet, and they have no need to understand the payload.
      </p>

      <h3>Cutting a message into packets</h3>
      <p>
        Every network sets a limit on how much payload one packet may carry. Say
        the limit is 1000 bytes. (In this course, 1 KB means 1000 bytes.) A
        message of 3500 bytes is cut like this:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            A 3500-byte message cut into packets of at most 1000 bytes
          </caption>
          <thead>
            <tr>
              <th scope="col">Packet number</th>
              <th scope="col">Payload</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE.map((p) => (
              <tr key={p.seq}>
                <th scope="row">{p.seq}</th>
                <td data-label="Payload">{p.bytes} bytes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Three full packets carry 3000 bytes. The last 500 bytes still need a
        packet of their own, a shorter one. So you always round <em>up</em>:
        3500 ÷ 1000 is 3.5, and the message needs 4 packets. The practice lab
        later in this lesson gives you five of these to work out.
      </p>

      <h3>Putting the message back together</h3>
      <p>
        The packet number in each header is a{' '}
        <Term id="sequence-number">sequence number</Term>. When packets arrive,
        the receiving device sorts them by number and joins the payloads in
        order. This matters because packets can take different routes and arrive
        in a different order than they left. The numbers also show when one is
        missing, so the receiver can ask for it to be sent again.
      </p>

      <h3>What packets cost</h3>
      <p>
        Every packet carries a header, and the header is extra data that is not
        part of your message. In many real cases it is a few tens of bytes. Take
        a header of 40 bytes as an example:
      </p>
      <ul>
        <li>
          With 1000 bytes of payload, the header is 40 out of every 1040 bytes
          sent, about 4 percent.
        </li>
        <li>
          With only 100 bytes of payload, it is 40 out of 140, about 29 percent.
        </li>
      </ul>
      <p>
        So very small packets waste a lot of capacity on labels, and very large
        packets take longer to send and are costlier to repeat when one is lost.
        Networks pick a limit between the two. Packets also have to wait their
        turn at routers, and they can arrive late, out of order, or not at all.
        You will see where waiting comes from in the next sections.
      </p>
      <p className={styles.note}>
        A packet is a self-contained delivery with its own label. That is what
        lets many conversations share the same links.
      </p>
    </>
  );
}

/** Go deeper: header fields. */
export function HeaderDeeper() {
  return (
    <>
      <p>
        Real headers have several fields. Typical ones are the sender&rsquo;s
        address, the receiver&rsquo;s address, the length of the packet, a check
        value that lets the receiver notice damaged data, and a counter that
        stops a packet from travelling forever if something goes wrong.
      </p>
      <p>
        Headers are also stacked: a packet is placed inside another packet with
        its own header, and that inside another. Each layer has its own job. The
        lesson on encapsulation and headers in Level 2 opens this up field by
        field.
      </p>
    </>
  );
}

/** Go deeper: why 1500 bytes. */
export function PacketSizeDeeper() {
  return (
    <>
      <p>
        On Ethernet, the common wired network in homes and offices, the usual
        largest payload in one frame is 1500 bytes. That is why a lot of
        internet traffic is cut into pieces of about that size, and why this
        lesson uses round numbers such as 1000 bytes, which are simpler to check
        by hand.
      </p>
      <p>
        Smaller limits make sense on some links, and bigger ones on special
        networks. If a packet is too big for a link on its path, it may be split
        further or it may be dropped and the sender told to use smaller ones.
        The details belong to later levels.
      </p>
    </>
  );
}
