import styles from './lesson.module.css';

type Site = { site: string; role: string };

const SITES: Site[] = [
  { site: 'Central library', role: 'Holds the catalogue server' },
  { site: 'North branch library', role: 'Its own LAN, joined to the city' },
  { site: 'Town hall', role: 'Offices and payment desks' },
  { site: 'Traffic control room', role: 'Reads the traffic-light sensors' },
];

/** Section 4: the MAN. */
export function Man() {
  return (
    <>
      <p>
        A <strong>MAN</strong> is a network the size of a city. It joins many
        sites that are too far apart for one LAN but still in the same area. The
        rule of thumb is up to about 100 kilometres. It is often run by a city
        council, a university with sites around town, or a provider that serves
        one city.
      </p>

      <h3>A worked example: one city, many sites</h3>
      <p>
        A city has twelve libraries, a town hall and a traffic control room,
        spread over a city about 25 kilometres wide. Each building has its own
        LAN. The city then runs a fibre cable network that joins all those LANs
        into one. Four of the sites:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Some sites of the city network.</caption>
          <thead>
            <tr>
              <th scope="col">Site</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {SITES.map((s) => (
              <tr key={s.site}>
                <th scope="row">{s.site}</th>
                <td data-label="Role">{s.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        With the MAN in place, a book borrowed at the north branch shows up in
        the central catalogue at once, and the traffic control room can read its
        sensors from one place. Each library still looks after its own LAN. The
        city looks after the network between them.
      </p>

      <h3>How a MAN is built</h3>
      <p>
        Between buildings the cable has to cross public streets, so MANs usually
        use <strong>optical fibre</strong>: thin glass cables that carry data as
        pulses of light and work over long distances. Some use wireless links
        between rooftops instead. Fibre is often laid as a loop around the city.
        If one cable is cut, data can go the other way round the loop, so one
        cut does not cut anyone off.
      </p>

      <h3>MAN versus LAN and WAN</h3>
      <ul>
        <li>
          <strong>Bigger than a LAN:</strong> it spreads over many sites, not
          one.
        </li>
        <li>
          <strong>Smaller than a WAN:</strong> it stays inside one city or
          region.
        </li>
        <li>
          <strong>A fair warning:</strong> the word MAN is used less than LAN
          and WAN. Many people call a city network a big LAN, or a small WAN. It
          still helps to know the middle step exists.
        </li>
      </ul>
    </>
  );
}

/** Go deeper: Metro Ethernet and how fuzzy the edges are. */
export function MetroDeeper() {
  return (
    <>
      <p>
        Companies that cannot lay their own fibre across a city can buy a
        service called Metro Ethernet from a telecom company. The customer plugs
        into it like an ordinary Ethernet cable, and the two sites behave as if
        a very long cable joined them. The company buys a service, not a cable:
        the telecom company owns and looks after everything in between.
      </p>
      <p>
        Where does a MAN end and a WAN begin? There is no sharp line. A network
        that joins two towns 150 kilometres apart is a WAN by the rule of thumb,
        but nobody will argue if you call it regional. The name is a hint, not a
        measurement.
      </p>
    </>
  );
}
