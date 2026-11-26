import styles from './lesson.module.css';

/** "Why it matters": where these ideas show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Every service you use is built in one of these ways, or a mix of them.
        Knowing which one helps you understand why things work, and why they
        sometimes stop.
      </p>
      <ul>
        <li>
          <strong>Why a site slows down.</strong> A shop on a sale day or a
          ticket site at opening time can be overloaded: too many clients for
          the servers behind it. Now you know the bottleneck is often the
          server&rsquo;s capacity, not your own connection.
        </li>
        <li>
          <strong>Why a whole service goes down at once.</strong> When one
          shared part fails, everyone is affected. That is why big services keep
          several copies of their servers.
        </li>
        <li>
          <strong>Why downloads and updates are built the way they are.</strong>{' '}
          Games and software updates reach millions of people on the same day.
          Companies use many servers, CDNs and sometimes peer help to cope.
        </li>
        <li>
          <strong>Jobs.</strong> System administrators, cloud engineers and
          network engineers ask &ldquo;what is the single point of
          failure?&rdquo; and &ldquo;how does this scale?&rdquo; every day.
        </li>
        <li>
          <strong>The rest of this course.</strong> Later levels use these two
          roles all the time: DNS, email and the web are all clients asking
          servers.
        </li>
      </ul>
    </>
  );
}

type Entry = {
  design: string;
  provider: string;
  scaling: string;
  failure: string;
  example: string;
};

const ENTRIES: Entry[] = [
  {
    design: 'Client-server',
    provider: 'One or more servers answer clients’ requests',
    scaling:
      'Owner adds capacity; time grows with clients once the server is the limit',
    failure: 'A single server is a single point of failure',
    example: 'Web, email, cloud storage',
  },
  {
    design: 'Peer-to-peer',
    provider: 'Every peer both asks and answers',
    scaling: 'Each peer adds supply; depends on peers uploading',
    failure: 'No one peer is essential, but peers come and go',
    example: 'BitTorrent-style file sharing',
  },
  {
    design: 'Hybrid',
    provider: 'Servers do some jobs (accounts, finding peers), peers do others',
    scaling: 'Servers stay small; peers or many servers carry the bulk',
    failure: 'If the helper server stops, newcomers may not find peers',
    example: 'Video calls, CDN with peer help, tracker-based downloads',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>Cheat sheet: client-server, peer-to-peer and hybrid</caption>
        <thead>
          <tr>
            <th scope="col">Design</th>
            <th scope="col">Who provides the service</th>
            <th scope="col">How it scales</th>
            <th scope="col">If something fails</th>
            <th scope="col">Example</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.design}>
              <th scope="row">{e.design}</th>
              <td data-label="Who provides the service">{e.provider}</td>
              <td data-label="How it scales">{e.scaling}</td>
              <td data-label="If something fails">{e.failure}</td>
              <td data-label="Example">{e.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
