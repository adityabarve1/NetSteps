import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { formatSeconds, totalSeconds } from './logic';

type Plan = { mbps: number; label: string };

// Megabytes per second is the bandwidth divided by 8 (8 bits make 1 byte).
const PLANS: Plan[] = [
  { mbps: 8, label: 'A weak mobile signal' },
  { mbps: 25, label: 'A modest home plan' },
  { mbps: 100, label: 'A common home plan' },
  { mbps: 1000, label: 'A gigabit plan' },
];

const perSecond = (mbps: number) => String(mbps / 8);

/** Section 2: bandwidth, how much fits through each second. */
export function Bandwidth() {
  const tenMegabytes = totalSeconds({
    fileMb: 80,
    bandwidthMbps: 10,
    latencyMs: 0,
  });
  return (
    <>
      <p>
        Bandwidth is about <em>amount per second</em>. Think of a pipe: a wider
        pipe lets more water through each second, and a wider link lets more
        data through each second.
      </p>

      <h3>Bits, bytes and the units on your plan</h3>
      <p>
        Data is counted in <Term id="bit">bits</Term>: a bit is a single 0 or 1.
        Eight bits make one <Term id="byte">byte</Term>. Network speeds are
        counted in bits, and file sizes in bytes. That mismatch causes more
        confusion than anything else in this lesson, so keep these three facts:
      </p>
      <ul>
        <li>
          1 megabit per second (1 Mbps) is 1,000,000 bits every second. A{' '}
          <Term id="megabit">megabit</Term> is one million bits.
        </li>
        <li>
          A <Term id="megabyte">megabyte</Term> (MB, capital B) is one million
          bytes, which is 8 megabits (Mb, small b).
        </li>
        <li>
          So to turn a plan in Mbps into megabytes per second, divide by 8.
        </li>
      </ul>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            What a plan means for file downloads, at best (bandwidth only, no
            delay)
          </caption>
          <thead>
            <tr>
              <th scope="col">Bandwidth</th>
              <th scope="col">Megabytes per second</th>
              <th scope="col">Example</th>
            </tr>
          </thead>
          <tbody>
            {PLANS.map((p) => (
              <tr key={p.mbps}>
                <th scope="row">{p.mbps} Mbps</th>
                <td data-label="Megabytes per second">
                  {perSecond(p.mbps)} MB per second
                </td>
                <td data-label="Example">{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>A worked example</h3>
      <p>A file is 10 megabytes and your link carries 10 Mbps. How long?</p>
      <ol className={styles.steps}>
        <li>Turn bytes into bits: 10 MB &times; 8 = 80 megabits.</li>
        <li>
          Divide by the bandwidth: 80 megabits &divide; 10 Mbps ={' '}
          {formatSeconds(tenMegabytes)} seconds.
        </li>
      </ol>
      <p>
        A common slip is to divide 10 by 10 and say &ldquo;1 second&rdquo;. That
        mixes bytes with bits and is eight times too optimistic.
      </p>

      <h3>Who shares the pipe</h3>
      <p>
        Bandwidth is a limit on the link, not a promise to you alone. If four
        people in one home all stream video, they share the one connection. The
        part of the path with the smallest bandwidth is its{' '}
        <Term id="bottleneck">bottleneck</Term>: a 1000 Mbps plan feeding a
        Wi-Fi signal that carries only 50 Mbps to your room gives you at most 50
        Mbps.
      </p>
      <p className={styles.note}>
        Direction matters too. Data you receive is a{' '}
        <Term id="download">download</Term> and data you send is an{' '}
        <Term id="upload">upload</Term>. A link can have a different bandwidth
        for each direction. Home plans often offer much less for upload than for
        download.
      </p>
    </>
  );
}

/** Go deeper: kilo, mega, giga. */
export function PrefixesDeeper() {
  return (
    <>
      <p>
        Network units use powers of ten: kilo is 1,000, mega is 1,000,000, giga
        is 1,000,000,000. So 1 gigabit per second is 1000 Mbps. A kilobyte is
        1,000 bytes in this course.
      </p>
      <p>
        Computer memory is often counted in powers of two instead, where
        &ldquo;kilo&rdquo; can mean 1,024. That is why an operating system can
        show a file size that differs a little from the number on a website.
        Link speeds always use powers of ten.
      </p>
    </>
  );
}

/** Go deeper: what an advertised speed means. */
export function AdvertisedDeeper() {
  return (
    <>
      <p>
        The number on a plan is usually a maximum, often written &ldquo;up
        to&rdquo;. You reach it only when nothing else limits you: the Wi-Fi in
        your home, the server you talk to, and other people using the same
        connection can all be slower than the plan.
      </p>
      <p>
        Wi-Fi and mobile links also change from moment to moment with distance,
        walls and crowds. A speed test measures one moment on one path, so the
        same test can give different numbers an hour later.
      </p>
    </>
  );
}
