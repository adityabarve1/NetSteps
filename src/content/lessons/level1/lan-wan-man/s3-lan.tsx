import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Example = { place: string; devices: string; run: string; links: string };

const EXAMPLES: Example[] = [
  {
    place: 'A home',
    devices: 'A few to a few dozen: phones, laptops, a TV, a printer',
    run: 'One household',
    links: 'Wi-Fi, plus a cable or two to the router',
  },
  {
    place: 'An office floor',
    devices: 'Tens to hundreds: desktops, phones, printers',
    run: 'The company’s IT team',
    links: 'Cables to switches, plus Wi-Fi',
  },
  {
    place: 'A school',
    devices: 'Hundreds to thousands, many of them students’ own devices',
    run: 'The school’s IT staff',
    links: 'Cables between buildings, many Wi-Fi access points',
  },
];

/** Section 3: the LAN. */
export function Lan() {
  return (
    <>
      <p>
        A <strong>LAN</strong> is the network you use every day without
        noticing. It covers one place: a home, an office floor, a school
        building or a group of buildings on one site. As a rule of thumb it
        reaches up to about 2 kilometres. One person or organisation usually
        owns and runs the whole thing.
      </p>

      <h3>Three LANs you know</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Typical LANs. The numbers are rough.</caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Devices</th>
              <th scope="col">Run by</th>
              <th scope="col">Links</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((e) => (
              <tr key={e.place}>
                <th scope="row">{e.place}</th>
                <td data-label="Devices">{e.devices}</td>
                <td data-label="Run by">{e.run}</td>
                <td data-label="Links">{e.links}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>How a LAN is built</h3>
      <p>
        The parts are the ones from lesson 1.1.{' '}
        <Term id="ethernet">Ethernet</Term> cables join devices to{' '}
        <Term id="switch">switches</Term>. A Wi-Fi{' '}
        <Term id="access-point">access point</Term> lets phones and laptops join
        without a cable. At the edge of the LAN sits a{' '}
        <Term id="router">router</Term>, the device that joins the LAN to other
        networks, such as the internet. In a small home, one box does all three
        jobs.
      </p>
      <p>
        Because the devices are close, the owner can use whatever cables and
        equipment they like, and can change them at any time. Nobody else has to
        agree.
      </p>

      <h3>What a LAN is good at</h3>
      <ul>
        <li>
          <strong>Local sharing.</strong> A printer, a file folder or a media
          player can be shared inside the LAN without leaving the building.
        </li>
        <li>
          <strong>Low delay.</strong> The distances are short, so a message
          crosses a LAN very quickly.
        </li>
        <li>
          <strong>Your own rules.</strong> The owner decides who can join, for
          example with a Wi-Fi password.
        </li>
      </ul>
      <p>
        A LAN does not need the internet. If your internet connection goes down,
        the devices on your LAN can usually still reach each other and the
        printer.
      </p>
    </>
  );
}

/** Go deeper: Ethernet, Wi-Fi and subnets in a LAN. */
export function LanTechDeeper() {
  return (
    <>
      <p>
        Ethernet and Wi-Fi are the two usual LAN technologies. Ethernet is the
        wired family, written as IEEE 802.3. Wi-Fi is the wireless family,
        written as IEEE 802.11. IEEE is the organisation that publishes both
        standards. Level 2 looks at them in detail.
      </p>
      <p>
        In a small LAN, all devices usually share one{' '}
        <Term id="subnet">subnet</Term> (for example 192.168.1.0/24). A large
        LAN, such as a big school, is often cut into several subnets joined by
        routers, so one huge group of devices does not have to share everything.
        One LAN can therefore hold more than one subnet.
      </p>
    </>
  );
}

/** Go deeper: private addresses. */
export function PrivateAddressDeeper() {
  return (
    <>
      <p>
        You may have noticed that home networks use addresses that start with
        192.168. These come from three ranges set aside for use inside networks,
        called <Term id="private-address">private addresses</Term>. They are
        defined in a document named RFC 1918:
      </p>
      <ul>
        <li>10.0.0.0 to 10.255.255.255 (written 10.0.0.0/8)</li>
        <li>172.16.0.0 to 172.31.255.255 (written 172.16.0.0/12)</li>
        <li>192.168.0.0 to 192.168.255.255 (written 192.168.0.0/16)</li>
      </ul>
      <p>
        These addresses are not used on the public internet. That is why your
        192.168.1.10 and a stranger&rsquo;s 192.168.1.10 can both exist at the
        same time: each one only has meaning inside its own LAN. The router at
        the edge of a LAN takes care of the step from private to public
        addresses. A later level explains how.
      </p>
    </>
  );
}
