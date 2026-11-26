import styles from './lesson.module.css';

type Row = { question: string; circuit: string; packet: string };

const ROWS: Row[] = [
  {
    question: 'Before sending',
    circuit: 'A circuit must be set up first, which takes time',
    packet: 'Nothing to set up; the first packet can leave at once',
  },
  {
    question: 'Capacity',
    circuit: 'Reserved for one call, even when it is silent',
    packet: 'Shared; used only while packets are being sent',
  },
  {
    question: 'Delay',
    circuit: 'Short and steady once the call is up',
    packet: 'Varies, because packets wait in queues',
  },
  {
    question: 'Order of arrival',
    circuit: 'Always in order: one path',
    packet: 'Can be out of order; numbers fix it',
  },
  {
    question: 'Extra data',
    circuit: 'Little: the path says where data goes',
    packet: 'A header on every packet',
  },
  {
    question: 'When the network is full',
    circuit: 'New callers get a busy signal',
    packet: 'Everything slows down and some packets are dropped',
  },
  {
    question: 'When a link breaks',
    circuit: 'The call drops and needs a new setup',
    packet: 'Later packets can take another route',
  },
  {
    question: 'Best suited to',
    circuit: 'Steady streams that need a guarantee',
    packet: 'Bursty traffic and many users sharing links',
  },
];

const MYTHS: { myth: string; fact: string }[] = [
  {
    myth: 'Packet switching is always faster than circuit switching.',
    fact: 'It depends. Packets share a link well and avoid setup, but each hop adds waiting. A reserved circuit, once set up, has no waiting at routers. The try-it above lets you find cases where each one wins.',
  },
  {
    myth: 'Circuit switching is dead.',
    fact: 'Everyday internet traffic does not use it, but the idea of reserving capacity lives on in leased lines, in dedicated optical paths and in the priority marks that give some packets first call on a link.',
  },
  {
    myth: 'Every packet of a message takes a different road.',
    fact: 'They can, and the simulation showed that. In practice routers often keep one conversation on one path and switch only when something changes, such as a failure or a busy link.',
  },
  {
    myth: 'The internet never loses any data.',
    fact: 'Packets do get lost when queues overflow or links fail. The two computers at the ends notice and send the missing packets again, so you rarely see it.',
  },
  {
    myth: 'A phone call over the internet is a circuit.',
    fact: 'Calls over the internet are cut into packets like any other data. They feel like a continuous line because the packets arrive fast enough to play smoothly.',
  },
];

/** Section 6: comparing the two. */
export function Comparing() {
  return (
    <>
      <p>
        Now you can put the two methods side by side. Neither wins every row.
        Circuit switching gives a guarantee and pays for it in wasted capacity.
        Packet switching shares capacity well and pays for it in uncertainty.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Circuit switching and packet switching compared</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Circuit switching</th>
              <th scope="col">Packet switching</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.question}>
                <th scope="row">{r.question}</th>
                <td data-label="Circuit switching">{r.circuit}</td>
                <td data-label="Packet switching">{r.packet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Which one fits which job?</h3>
      <p>
        A live voice call is a steady stream, so a reserved circuit suits it
        well. A web page, an email or a file is a burst followed by quiet, so
        packets suit it. When data of both kinds shares one network, as it does
        today, the flexible method wins because it can carry both, with some
        care to keep calls smooth.
      </p>

      <h3>Five common myths</h3>
      <ul className={styles.myths}>
        {MYTHS.map((m) => (
          <li key={m.myth}>
            <p>
              <span className={styles.label}>Myth: </span>
              {m.myth}
            </p>
            <p>
              <span className={styles.label}>Fact: </span>
              {m.fact}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Go deeper: message switching. */
export function MessageSwitchingDeeper() {
  return (
    <>
      <p>
        There is a third method between the two: send the whole message as one
        unit, and let every device along the way store it and pass it on. The
        telegraph system worked like this, with operators at each station
        copying a message and sending it to the next.
      </p>
      <p>
        You saw its cost in the store-and-forward section: each hop waits for
        the entire message, so the time grows with the number of hops. Cutting
        the message into packets lets the hops work in parallel. Email today
        still stores whole messages on mail servers between hops, but each hop
        itself rides on packets.
      </p>
    </>
  );
}

/** Go deeper: virtual circuits. */
export function VirtualCircuitDeeper() {
  return (
    <>
      <p>
        Some networks blend the two ideas. A <em>virtual circuit</em> sets up a
        path first, so that all the packets of a conversation follow the same
        route, but it does not reserve capacity: the links are still shared.
        Older network types such as Frame Relay and ATM worked like this, and a
        modern version appears in the label-based paths that some providers use
        inside their networks.
      </p>
      <p>
        The ordinary internet does not set up a path before sending. Each router
        looks at each packet on its own, which is what keeps the network simple
        and able to recover from failures.
      </p>
    </>
  );
}
