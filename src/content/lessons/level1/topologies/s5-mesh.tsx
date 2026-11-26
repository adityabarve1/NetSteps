import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

// Links needed to join n devices directly to each other: n(n - 1) / 2.
const ROWS = [3, 4, 5, 10, 20].map((n) => ({
  n,
  links: (n * (n - 1)) / 2,
  ports: n - 1,
}));

/** Section 5: full mesh and partial mesh. */
export function Mesh() {
  return (
    <>
      <p>
        In a full mesh, every device has its own direct cable to every other
        device. Picture a room where everybody has a private phone line to each
        other person. Nobody ever has to ask someone else to pass a message on.
      </p>

      <h3>How a message travels in a mesh</h3>
      <p>
        With a direct cable to everyone, a message goes straight from sender to
        receiver: one link. If that cable is cut, the message takes a longer
        route through a third device. A to B fails, so A sends to D, and D
        passes it to B. That is called rerouting, and it is the mesh&rsquo;s big
        advantage. The devices in a mesh must pass messages along for each
        other, so in a real mesh they are network devices such as routers.
      </p>

      <h3>Counting the cables</h3>
      <p>
        Count the links like this. Each of n devices has a cable to the other n
        &minus; 1. That makes n &times; (n &minus; 1) cable ends. A cable has
        two ends, so each cable was counted twice. The number of cables is
        therefore <strong>n(n &minus; 1) / 2</strong>. Each device also needs n
        &minus; 1 sockets.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Cables needed to build a full mesh</caption>
          <thead>
            <tr>
              <th scope="col">Devices (n)</th>
              <th scope="col">Cables, n(n &minus; 1) / 2</th>
              <th scope="col">Sockets on each device</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.n}>
                <th scope="row">{r.n}</th>
                <td data-label="Cables">{r.links}</td>
                <td data-label="Sockets on each device">{r.ports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The cost grows much faster than the number of devices. Doubling from 10
        to 20 devices more than quadruples the cables, from 45 to 190.
      </p>

      <h3>What breaks, and partial mesh</h3>
      <ul>
        <li>
          <strong>If one cable is cut:</strong> traffic reroutes, and in a full
          mesh everyone can still talk.
        </li>
        <li>
          <strong>If one device fails:</strong> that device drops out. The
          others still have cables between them, so they carry on.
        </li>
        <li>
          <strong>If all of a device&rsquo;s cables are cut:</strong> that
          device is cut off. The others still talk to each other.
        </li>
      </ul>
      <p>
        Because a full mesh costs so much, most real meshes are a{' '}
        <Term id="partial-mesh">partial mesh</Term>: only some pairs are joined
        directly. The important devices get several links, and the rest get one
        or two. It is a compromise between the cost of a full mesh and the
        weakness of a single path.
      </p>
      <p>
        The internet is a partial mesh of networks. Big networks, such as
        internet providers, connect to several others, so there are many routes
        between any two places. A cut cable under the sea usually does not
        disconnect a country that has several cables. A place with only one or
        two cables can be cut off, so the shape protects only where the links
        really exist.
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Worked example.</strong> Five devices, A to E, form a full
          mesh: 5 &times; 4 / 2 = 10 cables.
        </li>
        <li>
          The cables A to B and A to C are cut. A still has cables to D and E,
          and D and E are joined to B and C, so all five can still talk.
        </li>
        <li>
          All four of A&rsquo;s cables are cut. A is cut off. B, C, D and E are
          joined to each other, so those four still talk.
        </li>
      </ol>
    </>
  );
}

/** Go deeper: how fast a full mesh grows. */
export function MeshGrowthDeeper() {
  return (
    <>
      <p>
        The formula shows why nobody builds a full mesh for a large network. A
        full mesh of 100 devices needs 100 &times; 99 / 2 = 4,950 cables, and
        each device needs 99 sockets. Real networks use a few links per device
        and rely on routing to find a path.
      </p>
      <p>
        You can also write it the other way round. Adding one more device to a
        mesh of n devices adds n new cables, one to each existing device. That
        is why the table grows faster and faster.
      </p>
    </>
  );
}

/** Go deeper: partial mesh limits. */
export function PartialMeshDeeper() {
  return (
    <>
      <p>
        A partial mesh can still be cut in two. Imagine five devices joined in a
        chain, A to B to C to D to E, with no other links. That is a (very thin)
        partial mesh. Cutting B to C leaves {'{'}A, B{'}'} and {'{'}C, D, E{'}'}{' '}
        unable to reach each other.
      </p>
      <p>
        Network designers count independent routes. If every pair of devices has
        at least two routes that share no cable and no device, then any single
        break leaves everyone connected. Adding a link between E and A to the
        chain makes a ring that can send either way round, and that already
        gives every pair two such routes.
      </p>
      <p>
        Wi-Fi systems sold for large homes use the same idea. Extra boxes pick
        up the signal from each other and pass it on, so a box can reach the
        router through another box.
      </p>
    </>
  );
}
