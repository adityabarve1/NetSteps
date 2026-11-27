import styles from './lesson.module.css';

/** "Why it matters": where these ideas show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Bandwidth and latency decide how an online service feels. Knowing which
        one you are dealing with saves you from buying the wrong fix.
      </p>
      <ul>
        <li>
          <strong>Choosing a plan.</strong> A bigger plan helps downloads,
          streaming and many people sharing a home. It will not cure lag in a
          game that is hosted far away.
        </li>
        <li>
          <strong>Online games and calls.</strong> They send small messages
          again and again, so they depend on latency and jitter far more than on
          bandwidth.
        </li>
        <li>
          <strong>Websites and apps.</strong> Developers cut the number of round
          trips, serve copies from servers near you and compress data. Those
          tricks target latency and bandwidth separately.
        </li>
        <li>
          <strong>Cloud and remote work.</strong> Moving a team&rsquo;s files to
          another continent changes the latency of everything they open. Teams
          pick data centre locations with this in mind.
        </li>
        <li>
          <strong>Jobs.</strong> Network engineers, site reliability engineers
          and web performance specialists measure latency and throughput daily
          and decide which one to improve.
        </li>
        <li>
          <strong>The rest of this course.</strong> Later levels use these ideas
          in how protocols wait for replies, how routers queue packets and how
          the web is made faster.
        </li>
      </ul>
    </>
  );
}

type Entry = { term: string; what: string; example: string };

const ENTRIES: Entry[] = [
  {
    term: 'Bandwidth',
    what: 'The most data a link can carry each second (the width of the pipe)',
    example: '100 Mbps',
  },
  {
    term: 'Latency',
    what: 'The time for one message to cross the link (the length of the road)',
    example: '50 ms',
  },
  {
    term: 'Round-trip time',
    what: 'The time there and back. Ping reports it',
    example: 'time=20 ms',
  },
  {
    term: 'Total time',
    what: 'The delay plus the sending time, in this lesson’s model',
    example: '50 ms + 80 Mb ÷ 10 Mbps = 8.05 s',
  },
  {
    term: 'Throughput',
    what: 'The rate you actually get: data moved divided by the time taken',
    example: '80 Mb in 8.05 s = 9.94 Mbps',
  },
  {
    term: 'Bandwidth-delay product',
    what: 'Bandwidth × round-trip time: the bits on the way at once',
    example: '100 Mbps × 20 ms = 2,000,000 bits',
  },
  {
    term: 'Bits and bytes',
    what: '8 bits make 1 byte. Speeds use bits, files use bytes',
    example: '100 Mbps = 12.5 MB per second',
  },
  {
    term: 'Propagation delay',
    what: 'Travel time of the signal, about 5 ms per 1000 km of fibre',
    example: '5,000 km: at least 25 ms one way',
  },
  {
    term: 'Transmission delay',
    what: 'Time to put the message on the link: size ÷ bandwidth',
    example: '12,000 bits ÷ 100 Mbps = 0.12 ms',
  },
  {
    term: 'Queueing delay',
    what: 'Waiting in line inside a device that is busy',
    example: 'A router with a full queue',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>Cheat sheet: bandwidth and latency</caption>
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
              <td data-label="What it is">{e.what}</td>
              <td data-label="Example">{e.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
