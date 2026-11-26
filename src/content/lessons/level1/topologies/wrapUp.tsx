import styles from './lesson.module.css';

/** "Why it matters": where topologies show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Every network you will ever meet is built from these four shapes, or a
        mix of them. Knowing the shape tells you, before anything breaks, what
        will break.
      </p>
      <ul>
        <li>
          <strong>Fixing problems.</strong> If one device is offline, in a star
          you check its own cable first. If everything is offline, you look at
          the centre: the router or switch.
        </li>
        <li>
          <strong>Planning a network.</strong> Deciding how many cables, sockets
          and spare parts to buy is a topology decision. A spare switch costs
          money, and a long outage costs more.
        </li>
        <li>
          <strong>Reading diagrams.</strong> Network diagrams at school and at
          work use these shapes. You can now say &ldquo;this part is a star and
          that part is a partial mesh&rdquo;.
        </li>
        <li>
          <strong>Jobs.</strong> Network engineers design for failure. They ask
          &ldquo;what is the single point of failure?&rdquo; about every
          network.
        </li>
        <li>
          <strong>The rest of this course.</strong> Level 2 covers switches and
          the local network, and later levels cover routing. Both depend on how
          devices are joined. You have the shapes; the next lessons show how
          messages find their way across them.
        </li>
      </ul>
    </>
  );
}

type Entry = {
  shape: string;
  cable: string;
  breaks: string;
  cost: string;
  example: string;
};

const ENTRIES: Entry[] = [
  {
    shape: 'Bus',
    cable: 'One shared backbone, n − 1 pieces in our drawings',
    breaks:
      'Backbone cut: everyone stops. One device fails: only it drops out.',
    cost: 'Lowest cable cost; the backbone is a single point of failure',
    example: 'Early Ethernet on coaxial cable; a car’s control units',
  },
  {
    shape: 'Star',
    cable: 'n cables for n devices, plus a switch',
    breaks: 'Cable cut: one device offline. Switch fails: everyone stops.',
    cost: 'Moderate; the switch is a single point of failure',
    example: 'Home network around a router; office networks',
  },
  {
    shape: 'Ring',
    cable: 'n links for n devices',
    breaks: 'Single ring: any cut link or failed device stops everyone.',
    cost: 'Moderate; a second ring adds protection',
    example: 'Token Ring, FDDI, city fibre rings',
  },
  {
    shape: 'Full mesh',
    cable: 'n(n − 1) / 2 cables; n − 1 sockets on each device',
    breaks: 'Traffic reroutes; a device is cut off only if all its cables are.',
    cost: 'Highest; grows fast (10 devices: 45 cables)',
    example: 'The core of a big network; the internet (partial mesh)',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>Cheat sheet: the four topologies</caption>
        <thead>
          <tr>
            <th scope="col">Shape</th>
            <th scope="col">Cable needed</th>
            <th scope="col">What breaks</th>
            <th scope="col">Cost</th>
            <th scope="col">Example</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.shape}>
              <th scope="row">{e.shape}</th>
              <td data-label="Cable needed">{e.cable}</td>
              <td data-label="What breaks">{e.breaks}</td>
              <td data-label="Cost">{e.cost}</td>
              <td data-label="Example">{e.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
