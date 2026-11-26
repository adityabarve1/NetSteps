import styles from './lesson.module.css';

/** "Why it matters": where these ideas show up in real life. */
export function WhyItMatters() {
  return (
    <>
      <p>
        Every network problem starts with the same question: where is it broken?
        The sizes in this lesson give you a way to ask it. You can look at your
        own LAN first, then at the line to your provider, then at everything
        farther away.
      </p>
      <ul>
        <li>
          <strong>Finding faults.</strong> If the printer works but no website
          loads, your LAN is fine and the problem is on the line out of your
          home, or beyond it. If even the printer fails, start with your own
          LAN.
        </li>
        <li>
          <strong>Choosing and buying.</strong> A shop with a branch in another
          city needs a rented line or a VPN. A school only needs cables and
          Wi-Fi. Knowing the size tells you which kind of product to ask for.
        </li>
        <li>
          <strong>Reading job advertisements.</strong> LAN, WAN and SD-WAN are
          words that network jobs use every day. Now you know what each one
          covers.
        </li>
        <li>
          <strong>The rest of this course.</strong> Later lessons look at how
          devices are arranged inside a LAN and how data crosses a WAN. You now
          know where each of those pieces sits.
        </li>
      </ul>
    </>
  );
}

type Entry = {
  name: string;
  reach: string;
  example: string;
  runBy: string;
  tech: string;
};

const ENTRIES: Entry[] = [
  {
    name: 'PAN',
    reach: 'About 10 m or less',
    example: 'Phone and wireless earbuds',
    runBy: 'You',
    tech: 'Bluetooth, USB cable',
  },
  {
    name: 'LAN',
    reach: 'One place, up to about 2 km',
    example: 'Home Wi-Fi, a school building',
    runBy: 'One person or organisation',
    tech: 'Ethernet cables, Wi-Fi, switches',
  },
  {
    name: 'MAN',
    reach: 'A city, up to about 100 km',
    example: 'A council joining its libraries',
    runBy: 'A city, a company or a provider',
    tech: 'Fibre, wireless links',
  },
  {
    name: 'WAN',
    reach: 'Over about 100 km, with no upper limit',
    example: 'A bank joining branches in two countries',
    runBy: 'Telecom companies sell the lines; the customer rents them',
    tech: 'Leased lines, fibre, satellite',
  },
  {
    name: 'Internet',
    reach: 'The whole world',
    example: 'Your home LAN to a website far away',
    runBy: 'Thousands of organisations; no single owner',
    tech: 'All of the above, joined by routers',
  },
];

/** The cheat sheet: a table the learner can keep. */
export function CheatSheet() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>
          Cheat sheet: PAN, LAN, MAN, WAN. The distances are rules of thumb.
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Typical reach</th>
            <th scope="col">Example</th>
            <th scope="col">Who runs it</th>
            <th scope="col">Typical technology</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.name}>
              <th scope="row">{e.name}</th>
              <td data-label="Typical reach">{e.reach}</td>
              <td data-label="Example">{e.example}</td>
              <td data-label="Who runs it">{e.runBy}</td>
              <td data-label="Typical technology">{e.tech}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
