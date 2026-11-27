import styles from './lesson.module.css';

/** "Why it matters": where these ideas show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Packet switching is the design choice behind the internet. Knowing it
        explains many things you notice every day.
      </p>
      <ul>
        <li>
          <strong>Why your speed changes.</strong> You share links with other
          people, so queues build up at busy times. That is the cost of sharing,
          and it is also why the internet can serve so many people so cheaply.
        </li>
        <li>
          <strong>Why a video call glitches.</strong> Packets arrive with
          different delays, and some arrive late or not at all. The call
          software hides most of it, but not all.
        </li>
        <li>
          <strong>Why the internet survives broken links.</strong> Routers can
          send later packets another way. A cable cut rarely takes a whole
          country offline when other routes exist.
        </li>
        <li>
          <strong>Why phone and internet have merged.</strong> One packet
          network can carry calls, video and web pages, which is cheaper than
          running a separate circuit network for voice.
        </li>
        <li>
          <strong>Jobs.</strong> Network engineers size links for bursts, tune
          queues, give voice priority and design reserved paths for customers
          who need a guarantee. All of that starts with these two ideas.
        </li>
        <li>
          <strong>The rest of this course.</strong> Headers, routers, routing
          tables, retransmission and congestion control are all about packets.
          You now know why they exist.
        </li>
      </ul>
    </>
  );
}

type Entry = { term: string; meaning: string; example: string };

const ENTRIES: Entry[] = [
  {
    term: 'Switching method',
    meaning: 'The rule for moving data through the shared middle of a network',
    example: 'Circuit switching or packet switching',
  },
  {
    term: 'Circuit switching',
    meaning: 'Reserve a path for the whole conversation, then send',
    example: 'The old telephone network',
  },
  {
    term: 'Packet switching',
    meaning: 'Cut data into pieces that share links with other traffic',
    example: 'The internet',
  },
  {
    term: 'Packet',
    meaning: 'A header (labels) plus a payload (a piece of the message)',
    example: '3500 bytes at 1000 per packet: 4 packets',
  },
  {
    term: 'Sequence number',
    meaning: 'The number that lets the receiver put packets back in order',
    example: 'Packets arrive 2, 1, 4, 3 and are sorted to 1, 2, 3, 4',
  },
  {
    term: 'Store and forward',
    meaning: 'A router receives a whole packet, then sends it on',
    example: 'Each hop waits for the full packet',
  },
  {
    term: 'Queue',
    meaning: 'Packets waiting for a busy link; causes delay and drops',
    example: 'A full queue drops packets',
  },
  {
    term: 'Packet time',
    meaning: '(packets + hops − 1) × time to send one packet',
    example: '8 packets, 3 hops, 1 s each: 10 s',
  },
  {
    term: 'Circuit trade-off',
    meaning:
      'Steady and in order, but wastes idle capacity and drops if a link fails',
    example: 'A call with silences',
  },
  {
    term: 'Packet trade-off',
    meaning:
      'Shares well and reroutes, but delay varies and packets can be lost',
    example: 'A video call that sometimes glitches',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>Cheat sheet: packet and circuit switching</caption>
        <thead>
          <tr>
            <th scope="col">Term</th>
            <th scope="col">What it is</th>
            <th scope="col">Example</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.term}>
              <th scope="row">{e.term}</th>
              <td data-label="What it is">{e.meaning}</td>
              <td data-label="Example">{e.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
