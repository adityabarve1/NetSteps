import { Term } from '@/content/components/Term';
import { HybridDiagram } from './diagrams';
import styles from './lesson.module.css';

type Row = { example: string; servers: string; peers: string };

const ROWS: Row[] = [
  {
    example: 'A peer-to-peer file download with a tracker',
    servers: 'A server tells newcomers which peers have the file.',
    peers: 'The peers send the pieces to each other.',
  },
  {
    example: 'A video call that sets up through servers',
    servers: 'Servers keep accounts and help the two devices find each other.',
    peers:
      'When the networks allow it, the video can travel directly between the devices. Otherwise a server passes it along.',
  },
  {
    example: 'Software updates shared between nearby computers',
    servers:
      'The company’s servers hold the official files and the list of updates.',
    peers:
      'Some systems can take pieces from other computers on the same network.',
  },
];

/** Section 5: hybrid models. */
export function Hybrid() {
  return (
    <>
      <p>
        The two ways are not rivals in the real world. Designers pick the
        strengths of each. A design that mixes them is a{' '}
        <Term id="hybrid-model">hybrid model</Term>.
      </p>

      <h3>Servers for the jobs that need one, peers for the heavy lifting</h3>
      <p>
        Some jobs suit a server and are awkward for peers: keeping accounts,
        checking who you are, keeping a list of who is online. Other jobs are
        heavy and can be shared: moving large amounts of data. A hybrid gives
        each job to the side that does it best.
      </p>
      <HybridDiagram />
      <div data-prose="">
        <table className={styles.table}>
          <caption>Three hybrid designs and who does what</caption>
          <thead>
            <tr>
              <th scope="col">Example</th>
              <th scope="col">What the servers do</th>
              <th scope="col">What the peers do</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.example}>
                <th scope="row">{r.example}</th>
                <td data-label="What the servers do">{r.servers}</td>
                <td data-label="What the peers do">{r.peers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Many servers close to you</h3>
      <p>
        Another way to spread the load keeps clients and servers but uses many
        servers. A <Term id="cdn">content delivery network</Term> (CDN) is a
        company&rsquo;s worth of servers in many places that keep copies of
        popular files. You still ask a server, but a nearby one answers instead
        of one far away. The original server is asked less often, and your reply
        has a shorter way to travel.
      </p>
      <p>
        A CDN is still client-server at heart: you ask a server and it answers.
        Some services go one step further and also let viewers&rsquo; devices
        help deliver video to their neighbours, on top of a CDN. That mix is a
        hybrid.
      </p>
      <p className={styles.note}>
        Real services use these ideas in combination, and they change them over
        time. It is not always obvious from outside how a particular app does
        it. What you can do is know the building blocks.
      </p>
    </>
  );
}

/** Go deeper: what a CDN does. */
export function CdnDeeper() {
  return (
    <>
      <p>
        The server that owns the content is the origin. A CDN keeps copies,
        called caches, on its own servers near large groups of users. When you
        ask for a file, the system sends you to a nearby cache. If the cache has
        the file, it answers at once. If not, it asks the origin, keeps a copy,
        and then answers.
      </p>
      <p>
        This helps in two ways. It cuts the distance a reply must travel, and it
        spreads the requests over many servers. Level 6 covers CDNs and load
        balancers in detail.
      </p>
    </>
  );
}

/** Go deeper: why a pure design is rare. */
export function WhyMixDeeper() {
  return (
    <>
      <p>
        A pure peer-to-peer design has a hard job: peers must find each other
        with no helper, and nobody is responsible when something goes wrong. A
        pure client-server design has the opposite problem: the owner pays for
        all the capacity, even for the most popular file.
      </p>
      <p>
        Mixing them trades one problem against the other. A small server list or
        index is cheap to run, and it removes the hardest part of pure P2P.
        Letting peers carry the data removes the most costly part of pure
        client-server. The price is a design that is harder to build and test.
      </p>
    </>
  );
}
