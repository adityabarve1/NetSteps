import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Split = {
  device: string;
  address: string;
  network: string;
  part: string;
  verdict: string;
};

// Mask 255.255.255.0 for every row: the first three numbers are the network.
const SPLITS: Split[] = [
  {
    device: 'PC1',
    address: '192.168.1.10',
    network: '192.168.1',
    part: '10',
    verdict: 'The sender.',
  },
  {
    device: 'PC2',
    address: '192.168.1.20',
    network: '192.168.1',
    part: '20',
    verdict: 'Same network part as PC1: same subnet. A switch is enough.',
  },
  {
    device: 'PC3',
    address: '192.168.2.30',
    network: '192.168.2',
    part: '30',
    verdict: 'Different network part: another subnet. It needs a router.',
  },
];

/** Section 5: IP addresses, the subnet mask and subnets, in one minute. */
export function Addresses() {
  return (
    <>
      <p>
        When PC1 sent its message, how did the network know it was for PC2?
        Every host on a network has an address, the way every house on a street
        has one. The address most networks use is the{' '}
        <Term id="ip-address">IP address</Term>. IP stands for Internet
        Protocol, the protocol that carries messages between networks.
      </p>
      <p>
        The common kind of IP address (called IPv4) is four numbers with dots
        between them, such as{' '}
        <code className={styles.command}>192.168.1.10</code>. Each number is
        from 0 to 255. Two devices on the same network must never have the same
        address, or messages could go to the wrong one.
      </p>

      <h3>Two parts: the network and the device</h3>
      <p>
        An IP address has two parts. The first part names the network. The rest
        names one device in that network. A second number, the{' '}
        <Term id="subnet-mask">subnet mask</Term>, says where the split is.
      </p>
      <p>
        Homes very often use the mask{' '}
        <code className={styles.command}>255.255.255.0</code>. It means: the
        first three numbers are the network part, and the last number is the
        device part. Devices whose network parts match are in the same{' '}
        <Term id="subnet">subnet</Term>. They can reach each other directly,
        through switches. To reach a different subnet, a message needs a router.
      </p>

      <h3>Worked example: who is in PC1&rsquo;s subnet?</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Every row uses the mask 255.255.255.0</caption>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">IP address</th>
              <th scope="col">Network part</th>
              <th scope="col">Device part</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {SPLITS.map((s) => (
              <tr key={s.device}>
                <th scope="row">{s.device}</th>
                <td data-label="IP address">
                  <code>{s.address}</code>
                </td>
                <td data-label="Network part">
                  <code>{s.network}</code>
                </td>
                <td data-label="Device part">
                  <code>{s.part}</code>
                </td>
                <td data-label="Result">{s.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        That is why the lab asks you to give the two computers{' '}
        <code className={styles.command}>192.168.1.10</code> and{' '}
        <code className={styles.command}>192.168.1.20</code>, both with the mask{' '}
        <code className={styles.command}>255.255.255.0</code>. Same network
        part, different device parts: one subnet, two unique addresses.
      </p>
      <p>
        That is all you need for now. Level 3 explains addresses fully: the
        binary behind them, other masks, and how routers use them.
      </p>
    </>
  );
}

/** Go deeper: why there are two kinds of address. */
export function TwoAddressesDeeper() {
  return (
    <>
      <p>
        Every network adapter also has a <em>hardware address</em>, called a MAC
        address, such as <code>3C-22-FB-1A-7F-04</code>. The maker usually sets
        it, though many phones now make up a random one for each Wi-Fi network,
        for privacy. Switches use hardware addresses to deliver messages inside
        one local network.
      </p>
      <p>
        IP addresses do a different job: they work across networks, and routers
        use them to pass messages from one network to the next. When a laptop
        moves from home to a café, its hardware address normally stays the same,
        but it gets a new IP address from the new network. Think of a
        person&rsquo;s name and their postal address: the name stays with you,
        the postal address changes when you move. Level 2 covers hardware
        addresses and Level 3 covers IP addresses in depth.
      </p>
    </>
  );
}

/** Go deeper: details of IPv4 addresses you will see around. */
export function AddressDetailsDeeper() {
  return (
    <>
      <ul>
        <li>
          <strong>Slash notation.</strong> The mask 255.255.255.0 is often
          written as <code>/24</code>, because its first 24 bits are ones. So{' '}
          <code>192.168.1.0/24</code> means &ldquo;the network whose addresses
          start with 192.168.1&rdquo;. The lab accepts either form.
        </li>
        <li>
          <strong>Two reserved numbers.</strong> In a /24 subnet, the device
          parts 1 to 254 are for devices. Device part 0 names the network itself
          and 255 means &ldquo;every device in this subnet&rdquo;.
        </li>
        <li>
          <strong>Private addresses.</strong> Addresses that start with 192.168,
          with 10, or with 172.16 to 172.31 are set aside for private networks
          such as homes and offices. They are not used on the public internet;
          your home router usually shares one public address among them. Level 3
          explains how.
        </li>
        <li>
          <strong>Addresses are usually handed out.</strong> You rarely type an
          address yourself. When a device joins a network, the home router
          normally gives it one automatically.
        </li>
        <li>
          <strong>IPv6.</strong> The newer kind of IP address is much longer,
          such as <code>2001:db8::10</code>, because there are not enough IPv4
          addresses for every device in the world. Level 3 covers it.
        </li>
      </ul>
    </>
  );
}
