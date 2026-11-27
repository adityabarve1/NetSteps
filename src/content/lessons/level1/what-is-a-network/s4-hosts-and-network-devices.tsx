import { Term } from '@/content/components/Term';
import { HomeNetworkDiagram } from './diagrams';
import styles from './lesson.module.css';

type Row = { device: string; job: 'Host' | 'Network device'; why: string };

const ROWS: Row[] = [
  { device: 'Laptop', job: 'Host', why: 'You browse, send and receive on it.' },
  {
    device: 'Phone',
    job: 'Host',
    why: 'Its apps send and receive their own data.',
  },
  {
    device: 'Printer',
    job: 'Host',
    why: 'It receives pages to print and replies with its status.',
  },
  {
    device: 'Web server',
    job: 'Host',
    why: 'It answers requests for web pages.',
  },
  {
    device: 'Switch',
    job: 'Network device',
    why: 'It passes messages between devices in one network.',
  },
  {
    device: 'Router',
    job: 'Network device',
    why: 'It passes messages from one network to another.',
  },
  {
    device: 'Wi-Fi access point',
    job: 'Network device',
    why: 'It joins wireless devices to the network.',
  },
];

/** Section 4: hosts, network devices, the home router box, and "hosts do not forward". */
export function HostsAndNetworkDevices() {
  return (
    <>
      <p>
        Devices on a network do one of two jobs. Some <em>use</em> the network:
        they send and receive their own data. Others <em>run</em> the network:
        they carry everyone else&rsquo;s data along.
      </p>

      <h3>Hosts: where messages start and end</h3>
      <p>
        A <Term id="host">host</Term> is a device that sends and receives its
        own data. Laptops, phones, printers, smart TVs and servers are all
        hosts. Every message starts at a host and ends at a host, so hosts are
        also called <em>end devices</em>.
      </p>

      <h3>Network devices: the helpers in between</h3>
      <p>
        A <Term id="network-device">network device</Term> moves other
        devices&rsquo; data. The two you will meet most often are:
      </p>
      <ul>
        <li>
          A <strong>switch</strong> joins devices inside one local network: the
          devices in one place, such as one home or one office floor. It passes
          each message to the right device in that network.
        </li>
        <li>
          A <Term id="router">router</Term> joins different networks together,
          such as your home network and your internet provider&rsquo;s network.
          It passes each message on toward the network it is for.
        </li>
      </ul>
      <p>
        In the simulation, PC1 and PC2 were hosts and SW1 was a network device.
        Every trip on any network has that same shape: a host, then zero or more
        network devices, then a host.
      </p>

      <h3>Sort the devices</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Which job does each device do?</caption>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Job</th>
              <th scope="col">Because</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.device}>
                <th scope="row">{r.device}</th>
                <td data-label="Job">{r.job}</td>
                <td data-label="Because">{r.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>The box in your home is several devices in one</h3>
      <p>
        The box from your internet provider is usually called a router. In fact
        it is several devices in one case:
      </p>
      <ul>
        <li>
          a router, which joins your home network to the provider&rsquo;s
          network;
        </li>
        <li>a switch: the row of sockets on the back, for cables;</li>
        <li>
          a Wi-Fi <Term id="access-point">access point</Term>, which lets
          wireless devices join;
        </li>
        <li>
          often a <Term id="modem">modem</Term> as well, which turns the signal
          on the line from the street into data. Some homes have the modem as a
          separate small box.
        </li>
      </ul>
      <HomeNetworkDiagram />
      <p>
        This is why people mix up routers and switches: at home, both live in
        the same box. In a school or an office they are usually separate boxes,
        and you can see the difference.
      </p>

      <h3>A computer does not pass messages on</h3>
      <p>
        One more rule matters a lot. An ordinary computer keeps only the
        messages meant for itself. It does not pass on messages meant for
        others.
      </p>
      <p>
        So if you cable PC1 to PC2, and PC2 to PC3, PC1 still cannot reach PC3
        through PC2. To join three or more computers, plug each one into a
        switch. The lab at the end of this lesson follows the same rule.
      </p>
    </>
  );
}

/** Go deeper: what "host" means to engineers. */
export function HostMeaningDeeper() {
  return (
    <>
      <p>
        In internet standards, a host is a device with an address that sends and
        receives data for itself. A router is the opposite: it forwards data for
        others. Engineers often say &ldquo;host&rdquo; for any computer or
        server on a network.
      </p>
      <p>
        The line can blur, because &ldquo;host&rdquo; names a job, not a kind of
        box. A computer can be set up to act as a router. And a home router box
        acts as a host when you open its settings page in your browser: then it
        is talking to your laptop for itself, not passing data along.
      </p>
      <p>
        A simple switch, like the one in the simulation, needs no address of its
        own to do its job. Bigger, &ldquo;managed&rdquo; switches get an address
        so that staff can log in and change their settings.
      </p>
    </>
  );
}

/** Go deeper: other network devices you will meet later. */
export function MoreDevicesDeeper() {
  return (
    <ul>
      <li>
        <strong>Hub</strong>: an old, simple box that copies every message to
        every socket. Switches replaced hubs. Level 2 shows why.
      </li>
      <li>
        <strong>Firewall</strong>: a device or program that decides which
        messages may pass, by following rules. Level 7.
      </li>
      <li>
        <strong>Load balancer</strong>: spreads requests across many servers so
        that no single one is overloaded. Level 6.
      </li>
    </ul>
  );
}
