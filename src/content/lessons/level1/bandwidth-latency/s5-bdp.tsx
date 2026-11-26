import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { bandwidthDelayBits, bitsToKilobytes, formatBits } from './logic';

type Row = { link: string; mbps: number; rttMs: number };

const ROWS: Row[] = [
  { link: 'Home Wi-Fi to your own router', mbps: 100, rttMs: 2 },
  { link: 'A link across a country', mbps: 100, rttMs: 20 },
  { link: 'A fast link across an ocean', mbps: 1000, rttMs: 100 },
];

const kilobytes = (bits: number) => {
  const kb = bitsToKilobytes(bits);
  return kb >= 1000 ? `${String(kb / 1000)} MB` : `${String(kb)} KB`;
};

/** Section 5: the bandwidth-delay product. */
export function BandwidthDelay() {
  return (
    <>
      <p>
        Picture the link as a pipe that is long as well as wide. Water that
        entered a moment ago is still inside it. The same is true of data: at
        any moment, many bits have left the sender but not yet arrived. How many
        bits fit on the way at once? Bandwidth tells you how many go in each
        second. The round-trip time tells you how long they stay on the way.
        Multiply them.
      </p>

      <h3>The formula</h3>
      <p>
        The <Term id="bandwidth-delay-product">bandwidth-delay product</Term>{' '}
        (BDP) is <strong>bandwidth &times; round-trip time</strong>, with the
        bandwidth in bits per second and the time in seconds.
      </p>
      <ol className={styles.steps}>
        <li>
          Bandwidth: 100 Mbps is 100 &times; 1,000,000 = 100,000,000 bits per
          second.
        </li>
        <li>Round-trip time: 20 ms is 20 &divide; 1000 = 0.02 seconds.</li>
        <li>
          Multiply: 100,000,000 &times; 0.02 ={' '}
          {formatBits(bandwidthDelayBits(100, 20))}, which is{' '}
          {kilobytes(bandwidthDelayBits(100, 20))}.
        </li>
      </ol>
      <p>
        So on that link, a sender can send 2,000,000 bits before the first reply
        could possibly be back. To keep the pipe full, it must be allowed to
        have about that much data sent but not yet confirmed.
      </p>

      <h3>Three links compared</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            Bits on the way at once (bandwidth &times; round-trip time)
          </caption>
          <thead>
            <tr>
              <th scope="col">Link</th>
              <th scope="col">Bandwidth</th>
              <th scope="col">Round trip</th>
              <th scope="col">Bits on the way</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const bits = bandwidthDelayBits(r.mbps, r.rttMs);
              return (
                <tr key={r.link}>
                  <th scope="row">{r.link}</th>
                  <td data-label="Bandwidth">{r.mbps} Mbps</td>
                  <td data-label="Round trip">{r.rttMs} ms</td>
                  <td data-label="Bits on the way">
                    {formatBits(bits)} ({kilobytes(bits)})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Both numbers matter. A wide road with a short trip holds little at once.
        A wide road with a long trip holds a lot, and that is the situation that
        is hardest to use well.
      </p>
    </>
  );
}

/** Go deeper: windows and waiting for replies. */
export function WindowDeeper() {
  return (
    <>
      <p>
        Many protocols make the sender wait for a reply (an acknowledgement)
        that says &ldquo;this arrived&rdquo;. The amount a sender may have sent
        but not yet had confirmed is called its window. If the window is smaller
        than the bandwidth-delay product, the sender runs out of allowed data to
        send and waits, so the pipe is not full.
      </p>
      <p>
        For example, a 1000 Mbps link with a 100 ms round trip holds 12.5
        megabytes on the way. A sender with a window of 64 kilobytes can fill
        only about half of one percent of it. Later levels explain how real
        protocols choose and grow their window.
      </p>
    </>
  );
}

/** Go deeper: satellites. */
export function SatelliteDeeper() {
  return (
    <>
      <p>
        A satellite link in a high orbit shows both numbers at work. Its
        bandwidth can be good, but the signal travels tens of thousands of
        kilometres up and down, so the round trip is often somewhere around 500
        to 700 ms. Its bandwidth-delay product is large, and a short request
        feels slow however fast the plan is.
      </p>
      <p>
        Satellites in much lower orbits are far closer to the ground, so their
        latency is far lower, often a few tens of milliseconds. The difference
        comes from the length of the road, not the width of the pipe.
      </p>
    </>
  );
}
