import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { TransferSim } from './sim';

type Source = {
  name: string;
  what: string;
  depends: string;
  size: string;
};

// Sizes are rough, typical values for illustration, not guarantees.
const SOURCES: Source[] = [
  {
    name: 'Propagation delay',
    what: 'The time for the signal to travel along the cable or through the air',
    depends: 'The distance, and what the signal travels through',
    size: 'About 5 ms for every 1000 km of fibre',
  },
  {
    name: 'Transmission delay',
    what: 'The time to put all the bits of a message onto the link',
    depends: 'The message size and the bandwidth',
    size: '0.12 ms for a 1500-byte packet on a 100 Mbps link',
  },
  {
    name: 'Queueing delay',
    what: 'The time spent waiting in line inside a device such as a router',
    depends: 'How much other traffic is already waiting',
    size: 'Almost nothing on a quiet link, hundreds of ms on an overloaded one',
  },
  {
    name: 'Processing delay',
    what: 'The time a device spends reading a message and choosing where to send it',
    depends: 'How fast and how busy the device is',
    size: 'Usually a few microseconds, far below 1 ms',
  },
];

/** Section 3: latency and its four sources, then the simulation. */
export function Latency() {
  return (
    <>
      <p>
        Latency is about <em>time for one trip</em>. A message leaves your
        computer, crosses the network and arrives. The time that takes is the
        latency. Because a reply must come back too, people also quote the{' '}
        <Term id="round-trip-time">round-trip time</Term> (RTT): the time to go
        there and back. The <Term id="ping">ping</Term> command measures it. For
        a steady link, the one-way latency is about half the round trip.
      </p>

      <h3>The four sources of delay</h3>
      <p>
        Latency is not only distance. A message loses time in four ways. The{' '}
        <Term id="propagation-delay">propagation delay</Term> is the travel
        time. The <Term id="transmission-delay">transmission delay</Term> is the
        time to push the message onto the link. The{' '}
        <Term id="queueing-delay">queueing delay</Term> is time spent waiting in
        line, and the <Term id="processing-delay">processing delay</Term> is the
        time a device needs to look at a <Term id="packet">packet</Term> and
        decide where it goes next.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            The four sources of delay (the sizes are rough examples)
          </caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">What it is</th>
              <th scope="col">What it depends on</th>
              <th scope="col">Example size</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.name}</th>
                <td data-label="What it is">{s.what}</td>
                <td data-label="What it depends on">{s.depends}</td>
                <td data-label="Example size">{s.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>How this lesson uses the word</h3>
      <p>
        To keep the maths small, the lesson uses a simple model. Latency is the
        wait before the first bit arrives: the travel time, the queues and the
        processing. The time to push the whole file through the pipe is counted
        separately, as the file size divided by the bandwidth. In real networks
        every device along the way also pushes the packets onto its own link,
        which adds to the delay; the model leaves that out so the idea stays
        clear.
      </p>

      <h3>Watch it: widen the pipe, or shorten the road?</h3>
      <p>
        Press Next to step through. A file crosses a link. First we widen the
        pipe, then we shorten the road, and each time we look at the total.
      </p>
      <TransferSim />
      <p>Notice three things:</p>
      <ul>
        <li>
          Making the pipe 100 times wider (10 to 1000 Mbps) cut the total from
          8.05 seconds to 0.13, but never below the 0.05 seconds of delay.
        </li>
        <li>
          For the big file, a shorter road barely mattered: sending still took 8
          seconds.
        </li>
        <li>
          For the tiny request the roles flipped. The pipe was never the
          problem; the road was.
        </li>
      </ul>
    </>
  );
}

/** Go deeper: the distance floor. */
export function DistanceFloorDeeper() {
  return (
    <>
      <p>
        Signals in optical fibre travel at roughly two thirds of the speed of
        light in empty space, which is about 200,000 kilometres per second. That
        is about 5 microseconds for every kilometre, or 5 ms for every 1000 km.
      </p>
      <p>
        So distance sets a floor that no upgrade can remove. Two cities 5,000 km
        apart need at least about 25 ms one way, and about 50 ms there and back,
        even on a perfect straight cable. Real cables bend and cross many
        devices, so real round trips are longer. This is also why a service that
        keeps a copy of its data near you can answer faster.
      </p>
    </>
  );
}

/** Go deeper: why ping changes. */
export function JitterDeeper() {
  return (
    <>
      <p>
        Run ping several times and the numbers differ a little each time. The
        distance does not change, but the queueing delay does: sometimes your
        packet finds an empty queue and sometimes it waits behind others.
      </p>
      <p>
        The variation from one reply to the next is called jitter. A little
        jitter does not matter for a web page. It matters for a voice or video
        call, where small gaps in the stream are heard or seen. That is why a
        call can glitch even when the average ping looks fine.
      </p>
    </>
  );
}
