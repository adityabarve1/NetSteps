import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Row = { topic: string; lan: string; wan: string };

const ROWS: Row[] = [
  {
    topic: 'Reach',
    lan: 'One place, up to about 2 km',
    wan: 'Between cities and countries, over 100 km',
  },
  {
    topic: 'Who runs the links',
    lan: 'The owner of the LAN',
    wan: 'Mostly telecom companies; the customer rents',
  },
  {
    topic: 'Cost to change',
    lan: 'Low: buy a cable or a switch',
    wan: 'Higher: a monthly fee for each line',
  },
  {
    topic: 'Typical links',
    lan: 'Ethernet cable, Wi-Fi',
    wan: 'Leased lines, fibre, satellite, mobile',
  },
];

/** Section 5: the WAN. */
export function Wan() {
  return (
    <>
      <p>
        A <strong>WAN</strong> connects networks that are far apart: between
        cities, countries or continents. Its main job is to join LANs. A WAN is
        mostly the long links between an organisation&rsquo;s LANs, plus the
        routers that use those links.
      </p>

      <h3>A worked example: one shoe company</h3>
      <p>
        Acme Shoes has its head office in London and a warehouse in Madrid,
        about 1,250 kilometres away. Each place has its own LAN. Staff in London
        need to see what is in stock in Madrid, so the two LANs must be joined.
      </p>
      <ol>
        <li>
          Acme cannot lay a cable between two countries. It rents a line between
          the two sites from a telecom company. This is called a{' '}
          <Term id="leased-line">leased line</Term>, and only Acme uses it.
        </li>
        <li>
          At each end, a router joins the site&rsquo;s LAN to the rented line.
        </li>
        <li>
          A computer in London sends a request to the stock server in Madrid.
          The router in London passes it on to the line, and the router in
          Madrid passes it to the server.
        </li>
      </ol>
      <p>
        The rented line, and the two routers that use it, are the WAN. The two
        LANs at the ends stay LANs.
      </p>

      <h3>How a WAN differs from a LAN</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>LAN and WAN side by side.</caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col">LAN</th>
              <th scope="col">WAN</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.topic}>
                <th scope="row">{r.topic}</th>
                <td data-label="LAN">{r.lan}</td>
                <td data-label="WAN">{r.wan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The company that sells the lines is usually a telecom company or an{' '}
        <Term id="isp">ISP</Term> (internet service provider). The same kinds of
        companies sell you your home connection.
      </p>
    </>
  );
}

/** Go deeper: why distance adds delay. */
export function DelayDeeper() {
  return (
    <>
      <p>
        Signals cannot travel faster than light, and in an optical fibre they
        travel at roughly two thirds of the speed of light in a vacuum. That is
        about 200,000 kilometres per second, or 200 kilometres per millisecond.
      </p>
      <p>
        Worked example for Acme: 1,250 km divided by 200 km per millisecond is
        about 6.25 ms one way, so a reply cannot come back in less than about
        12.5 ms. Real cables do not run in a straight line, and every router
        adds a little delay, so the real figure is higher. A LAN message, with
        only a few metres to cross, has almost no such delay. A later lesson in
        this level looks at delay in detail.
      </p>
    </>
  );
}

/** Go deeper: SD-WAN, named only. */
export function SdWanDeeper() {
  return (
    <>
      <p>
        A company with many sites may rent several kinds of connection: a leased
        line, ordinary broadband and a mobile backup.{' '}
        <Term id="sd-wan">SD-WAN</Term> is software that manages all of them
        from one place. It decides, for example, to send video calls over the
        best line and to switch to another when one fails.
      </p>
      <p>
        You may see the name in job advertisements. This course only names it.
        What matters here is the idea underneath: a WAN joins LANs over lines
        that other companies provide.
      </p>
    </>
  );
}
