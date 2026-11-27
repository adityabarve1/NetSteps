import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Link = { link: string; how: string; note: string };

const LINKS: Link[] = [
  {
    link: 'Phone and wireless earbuds',
    how: 'Bluetooth (radio)',
    note: 'Sound data goes from the phone to the earbuds.',
  },
  {
    link: 'Phone and smartwatch',
    how: 'Bluetooth (radio)',
    note: 'The watch sends your step count to the phone.',
  },
  {
    link: 'Laptop and phone',
    how: 'USB cable',
    note: 'The laptop uses the phone’s mobile connection (tethering).',
  },
];

/** Section 2: the PAN. */
export function Pan() {
  return (
    <>
      <p>
        A <strong>PAN</strong> is the smallest network. It connects the devices
        that one person carries or uses within arm&rsquo;s reach: a phone,
        wireless earbuds, a smartwatch, a fitness band, a keyboard. The word
        “personal” is the point. The network is built around you and it moves
        with you.
      </p>

      <h3>What is in one person&rsquo;s PAN</h3>
      <p>
        Here is a typical morning for one person. Each row is a small network of
        two devices:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Three small links in one person&rsquo;s PAN.</caption>
          <thead>
            <tr>
              <th scope="col">Devices</th>
              <th scope="col">Joined by</th>
              <th scope="col">What happens</th>
            </tr>
          </thead>
          <tbody>
            {LINKS.map((l) => (
              <tr key={l.link}>
                <th scope="row">{l.link}</th>
                <td data-label="Joined by">{l.how}</td>
                <td data-label="What happens">{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>How a PAN reaches its devices</h3>
      <p>
        Most PANs use <Term id="bluetooth">Bluetooth</Term>. It is a radio link
        made for short distances and low power, so small batteries last. Many
        Bluetooth devices reach about 10 metres, and a wall or your own body can
        shorten that. That is why the rule of thumb for a PAN is about 10 metres
        or less.
      </p>
      <p>
        A cable can make a PAN too. Suppose you join your laptop to your phone
        with a USB cable and let the laptop use the phone&rsquo;s mobile data.
        That is called <Term id="tethering">tethering</Term>. The cable between
        the two devices is the PAN. The phone&rsquo;s own link to the mobile
        network is a different, much longer connection.
      </p>

      <h3>One device, several networks</h3>
      <p>
        Your phone belongs to your PAN, and it is also on your home Wi-Fi, which
        is a LAN. A device can be in more than one network at once. It has more
        than one link. You saw something similar in lesson 1.1, where a device
        with two adapters can have two addresses.
      </p>
      <p>
        An honest note: working engineers rarely say “PAN” in daily talk. They
        say “Bluetooth” or “USB”. The name is still useful, because it shows
        where the scale starts.
      </p>
    </>
  );
}

/** Go deeper: pairing, and why Bluetooth has a short range. */
export function BluetoothDeeper() {
  return (
    <>
      <p>
        Bluetooth radio uses the 2.4 GHz band, one of the radio bands that
        anyone may use without a licence. Two devices that have never met must{' '}
        <em>pair</em> first. During pairing they agree on a secret key. Later
        they use that key to recognise each other and to scramble their data.
      </p>
      <p>
        The range is short on purpose. A weaker signal uses less battery, and
        small things such as earbuds cannot carry a big battery. There is also a
        variant called Bluetooth Low Energy, used by fitness bands and trackers,
        which saves even more power.
      </p>
    </>
  );
}
