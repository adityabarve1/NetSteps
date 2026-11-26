import { TopologySim } from './sim';
import styles from './lesson.module.css';

type Row = {
  shape: string;
  cable: string;
  cut: string;
  device: string;
  today: string;
};

// Five devices in each shape (the star adds a switch in the middle).
const ROWS: Row[] = [
  {
    shape: 'Bus',
    cable:
      'One shared backbone (4 pieces in our drawing) and 5 short connections',
    cut: 'Everyone stops',
    device: 'Only that device drops out',
    today: 'Historical for LANs; buses live on inside cars and machines',
  },
  {
    shape: 'Star',
    cable: '5 cables and one switch with 5 sockets',
    cut: 'Only that device loses its connection',
    device: 'A failed device drops out alone; a failed switch stops everyone',
    today: 'Almost every home, school and office network',
  },
  {
    shape: 'Ring',
    cable: '5 links, 2 sockets on each device',
    cut: 'Everyone stops (single ring)',
    device: 'Everyone stops (single ring)',
    today: 'Rare in LANs; fibre rings join cities, with a second path',
  },
  {
    shape: 'Full mesh',
    cable: '10 cables, 4 sockets on each device',
    cut: 'Traffic reroutes; everyone still talks',
    device: 'That device drops out; the rest carry on',
    today: 'The core of big networks, usually as a partial mesh',
  },
];

/** Section 6: the comparison table and the primary simulation. */
export function Compare() {
  return (
    <>
      <p>
        You now know four shapes. This table puts them side by side for five
        devices in each. The failure columns follow our model of each shape.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>The four shapes compared (five devices each)</caption>
          <thead>
            <tr>
              <th scope="col">Shape</th>
              <th scope="col">Cable and sockets</th>
              <th scope="col">One cable is cut</th>
              <th scope="col">One device fails</th>
              <th scope="col">Where you find it</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.shape}>
                <th scope="row">{r.shape}</th>
                <td data-label="Cable and sockets">{r.cable}</td>
                <td data-label="One cable is cut">{r.cut}</td>
                <td data-label="One device fails">{r.device}</td>
                <td data-label="Where you find it">{r.today}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Watch each shape break</h3>
      <p>
        The simulation shows each shape working, then breaks a part of it in two
        different ways. Step through with <strong>Next</strong>, or press{' '}
        <strong>Play</strong>. A cut cable is dashed, crossed out and marked
        &ldquo;cut&rdquo;. A broken device is crossed out and marked
        &ldquo;down&rdquo;. A device that cannot talk to the others is marked
        &ldquo;cut off&rdquo;.
      </p>
      <TopologySim />
      <p>Notice three things:</p>
      <ul>
        <li>
          The same kind of break does different damage in different shapes. A
          cut in the bus or the ring stops everyone. In the star it cuts off one
          device. In the mesh it changes nothing you can see.
        </li>
        <li>
          Only the single ring stops completely when one device fails. In the
          bus, the star and the mesh the others carry on without it, unless the
          failed device is the star&rsquo;s switch.
        </li>
        <li>
          The shapes that survive more breaks (the mesh) use the most cable. The
          shape that uses the least cable (the bus) has the weakest backbone.
        </li>
      </ul>

      <h3>Why most networks choose the star</h3>
      <p>
        Every shape trades cost against reliability. A mesh survives almost
        anything but costs the most. A bus costs the least and is the most
        fragile. A star sits in the middle: one cable per device, and a single
        cable fault hurts only one device. Its weak spot is the switch, and that
        is much simpler to protect (for example with a spare) than a long shared
        cable. That is why the star won for local networks.
      </p>
    </>
  );
}

/** Go deeper: where real networks bend the model. */
export function RealWorldDeeper() {
  return (
    <>
      <p>
        The failure rules in this lesson are a model, and real networks have
        ways to bend them:
      </p>
      <ul>
        <li>
          <strong>Dual rings</strong> (FDDI, telephone rings) survive one break.
        </li>
        <li>
          <strong>Stars with extra cables.</strong> Switches can be joined by
          two cables instead of one, so one cut does not isolate a floor.
        </li>
        <li>
          <strong>Stars with a spare centre.</strong> Important networks use two
          switches or routers, so the centre is no longer a single point of
          failure.
        </li>
        <li>
          <strong>Buses built from hubs.</strong> A network of hubs behaves like
          a bus even though it is wired as a star: a failure on a hub or a
          shared segment can disturb everyone on it.
        </li>
      </ul>
      <p>
        Engineers say a network is <em>redundant</em> when it has spare parts or
        spare routes. Redundancy is how you remove single points of failure. It
        always costs more cable or more equipment.
      </p>
    </>
  );
}
