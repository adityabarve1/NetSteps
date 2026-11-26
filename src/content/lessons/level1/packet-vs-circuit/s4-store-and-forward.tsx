import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import {
  circuitSwitchingSeconds,
  messageSwitchingSeconds,
  packetSwitchingSeconds,
} from './logic';

// The worked example: 8000 bits sent over 3 links in a row at 1000 bits per
// second, as 8 packets of 1000 bits. Every number below comes from logic.ts.
const EXAMPLE = { messageBits: 8000, packetBits: 1000, hops: 3, rateBps: 1000 };
const PACKETS = EXAMPLE.messageBits / EXAMPLE.packetBits;
const PACKET_SECONDS = packetSwitchingSeconds(EXAMPLE);
const MESSAGE_SECONDS = messageSwitchingSeconds(EXAMPLE);
const CIRCUIT_SECONDS = circuitSwitchingSeconds({
  setupSeconds: 1,
  messageBits: EXAMPLE.messageBits,
  rateBps: EXAMPLE.rateBps,
});

// Which packet each link carries in each second: link k carries packet
// (second - k + 1), once that packet exists.
const SECONDS = Array.from({ length: PACKET_SECONDS }, (_, i) => i + 1);
const carried = (second: number, link: number): string => {
  const packet = second - link + 1;
  return packet >= 1 && packet <= PACKETS
    ? `packet ${String(packet)}`
    : '(idle)';
};

/** Section 4: store-and-forward. */
export function StoreAndForward() {
  return (
    <>
      <p>
        A packet does not fly from you to your friend in one leap. It crosses
        several links, one after another, and between them sit routers. Each
        crossing of one link, from one device to the next, is called a{' '}
        <Term id="hop">hop</Term>. A trip with three links is a trip of three
        hops.
      </p>

      <h3>What a router does with a packet</h3>
      <p>
        Routers follow a rule called{' '}
        <Term id="store-and-forward">store and forward</Term>. When a packet
        arrives, the router first receives the <em>whole</em> packet and stores
        it for a moment. It checks the header, decides which link leads toward
        the destination, and then forwards the packet onto that link.
      </p>
      <ol className={styles.steps}>
        <li>The packet arrives, bit by bit, until the router has all of it.</li>
        <li>The router reads the header and chooses the next link.</li>
        <li>
          If that link is busy with another packet, the packet waits in a{' '}
          <Term id="queue">queue</Term>, a line of packets waiting their turn.
        </li>
        <li>
          The router sends the packet onto the link, and the next hop begins.
        </li>
      </ol>
      <p>
        Because a router waits for the whole packet, a smaller packet gets
        through each hop sooner. That is one reason messages are cut up.
      </p>

      <h3>Why cutting the message up is faster</h3>
      <p>
        Compare two ways of sending the same message over three links in a row.
        The message is 8000 bits, every link runs at 1000 bits per second, and
        the packets are 1000 bits each, so there are {PACKETS} of them.
      </p>
      <p>
        With <Term id="message-switching">message switching</Term>, the whole
        message travels as one big piece. Each router must receive all 8000 bits
        before it sends anything on. One hop takes{' '}
        {EXAMPLE.messageBits / EXAMPLE.rateBps} seconds, so three hops take{' '}
        {MESSAGE_SECONDS} seconds.
      </p>
      <p>
        With packets, a router can start sending packet 1 onward while packet 2
        is still arriving. The links work at the same time, like workers on an
        assembly line. Here is each link&rsquo;s work, second by second:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            Eight packets crossing three links, one second per packet per link
          </caption>
          <thead>
            <tr>
              <th scope="col">Second</th>
              <th scope="col">Link 1 carries</th>
              <th scope="col">Link 2 carries</th>
              <th scope="col">Link 3 carries</th>
            </tr>
          </thead>
          <tbody>
            {SECONDS.map((s) => (
              <tr key={s}>
                <th scope="row">{s}</th>
                {[1, 2, 3].map((link) => (
                  <td key={link} data-label={`Link ${String(link)} carries`}>
                    {carried(s, link)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Packet 1 needs 3 seconds to cross the three links. Each later packet
        follows one second behind, so packet 8 arrives at second 10. The formula
        is{' '}
        <strong>
          (packets + hops − 1) × packet time = ({PACKETS} + 3 − 1) × 1 ={' '}
          {PACKET_SECONDS} seconds
        </strong>
        . Message switching took {MESSAGE_SECONDS}. The more hops there are, the
        more packets help.
      </p>
      <p className={styles.note}>
        For comparison, a circuit with 1 second of setup would take{' '}
        {CIRCUIT_SECONDS} seconds here: 1 second to set up, then 8 seconds for
        the message. Once the path is reserved the data does not stop at each
        router, so a circuit has no per-hop delay. The price is the setup and
        the reserved capacity, as you saw in the last section.
      </p>
    </>
  );
}

/** Go deeper: queueing. */
export function QueueingDeeper() {
  return (
    <>
      <p>
        The table above has no waiting, because nothing else was using the
        links. In a real network many packets from many senders arrive at a
        router at once. If three want the same outgoing link, one goes first and
        two wait in the queue.
      </p>
      <p>
        Waiting adds delay, and the delay changes from one packet to the next.
        That is why a video call over the internet can sound smooth one moment
        and glitchy the next. If a queue fills up completely, the router has no
        room to store another packet and drops it. The sender has to notice and
        send it again. Later levels show how that is handled.
      </p>
    </>
  );
}

/** Go deeper: what the formula leaves out. */
export function FormulaLimitsDeeper() {
  return (
    <>
      <p>
        The formula (packets + hops − 1) × packet time is a clean model. It
        assumes every link has the same speed, nothing waits in a queue and no
        packet is lost. It also ignores the time a signal needs to travel along
        a cable and the headers that every packet carries.
      </p>
      <p>
        The model also needs the message to be a whole number of equal packets,
        so it refuses a message that is not. Real messages end with a shorter
        packet, but the idea is the same: the first packet pays for the whole
        trip, and each extra packet adds only one packet time.
      </p>
    </>
  );
}
