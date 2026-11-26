import styles from './lesson.module.css';

/** "Why it matters": where these ideas show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Almost everything you do on a phone or a computer uses a network:
        messages, music, maps, games, school work, shopping and banking. Every
        one of those networks is made of the parts in this lesson: hosts,
        network devices, links and addresses.
      </p>
      <ul>
        <li>
          <strong>Fixing problems at home.</strong> When &ldquo;the internet is
          down&rdquo;, you can now ask the right question: is it the Wi-Fi link
          to the box, or the box&rsquo;s connection to the provider? Can the
          laptop still print? Then the home network itself is fine.
        </li>
        <li>
          <strong>Setting things up.</strong> A new printer, a games console or
          a smart speaker only works once it has a link and an address on your
          network.
        </li>
        <li>
          <strong>Jobs.</strong> Network engineers, cloud engineers and security
          teams use these words every day: host, link, switch, router, subnet.
        </li>
        <li>
          <strong>The rest of this course.</strong> Every later lesson builds on
          devices, links, hosts, network devices and addresses. You now have the
          map; the next lessons fill it in.
        </li>
      </ul>
    </>
  );
}

type Entry = { term: string; meaning: string; example: string };

const ENTRIES: Entry[] = [
  {
    term: 'Network',
    meaning: 'Two or more devices linked so they can exchange data',
    example: 'Two laptops and one cable',
  },
  {
    term: 'Link',
    meaning: 'What carries the data between two devices',
    example: 'Ethernet cable, fibre, Wi-Fi',
  },
  {
    term: 'Host',
    meaning: 'Sends and receives its own data',
    example: 'Laptop, phone, printer, server',
  },
  {
    term: 'Network device',
    meaning: 'Moves other devices’ data along',
    example: 'Switch, router, access point',
  },
  {
    term: 'Switch',
    meaning: 'Joins devices inside one network',
    example: 'The sockets on your home box',
  },
  {
    term: 'Router',
    meaning: 'Joins different networks',
    example: 'Home network to the internet',
  },
  {
    term: 'IP address',
    meaning: 'Identifies a device on a network',
    example: '192.168.1.10',
  },
  {
    term: 'Subnet mask',
    meaning: 'Splits the address into network and device parts',
    example: '255.255.255.0 (or /24)',
  },
  {
    term: 'Subnet',
    meaning: 'Devices whose network parts match',
    example: '192.168.1.10 and 192.168.1.20',
  },
  {
    term: 'Internet',
    meaning: 'The worldwide network of networks',
    example: 'Not the web, not Wi-Fi',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>Cheat sheet: what is a network</caption>
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
