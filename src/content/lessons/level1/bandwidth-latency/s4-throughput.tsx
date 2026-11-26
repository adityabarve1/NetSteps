import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { formatSeconds, throughputMbps, totalSeconds } from './logic';

type Case = {
  job: string;
  fileMb: number;
  bandwidthMbps: number;
  latencyMs: number;
};

const CASES: Case[] = [
  {
    job: 'A 10-megabyte file on a 10 Mbps link, 50 ms',
    fileMb: 80,
    bandwidthMbps: 10,
    latencyMs: 50,
  },
  {
    job: 'The same file on a 1000 Mbps link, 50 ms',
    fileMb: 80,
    bandwidthMbps: 1000,
    latencyMs: 50,
  },
  {
    job: 'A 1-kilobyte request on a 1000 Mbps link, 100 ms',
    fileMb: 0.008,
    bandwidthMbps: 1000,
    latencyMs: 100,
  },
];

// Megabits per second shown with sensible digits: 9.94, 615, 0.08.
function show(mbps: number): string {
  if (mbps >= 100) return String(Math.round(mbps));
  return String(Number(mbps.toFixed(2)));
}

// A share from 0 to 1 as a whole percent; tiny shares say so.
function percent(share: number): string {
  const p = share * 100;
  return p > 0 && p < 1 ? 'less than 1%' : `${String(Math.round(p))}%`;
}

/** Section 4: throughput against bandwidth. */
export function Throughput() {
  return (
    <>
      <p>
        Bandwidth is what the link <em>can</em> carry. What you actually get
        during a transfer is called <Term id="throughput">throughput</Term>: the
        amount of data you moved divided by the time it took. Throughput is
        never more than the bandwidth, and it is often less.
      </p>

      <h3>Why the delay pulls throughput down</h3>
      <p>
        The total time includes the wait for the road, during which no useful
        data arrives. So the throughput over a whole transfer is the file size
        divided by the total time, not by the sending time alone. Here are the
        same three jobs as in the simulation:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            Bandwidth, total time and the throughput you actually get
          </caption>
          <thead>
            <tr>
              <th scope="col">The job</th>
              <th scope="col">Total time</th>
              <th scope="col">Throughput</th>
              <th scope="col">Share of the bandwidth</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => {
              const t = throughputMbps(c);
              return (
                <tr key={c.job}>
                  <th scope="row">{c.job}</th>
                  <td data-label="Total time">
                    {formatSeconds(totalSeconds(c))} seconds
                  </td>
                  <td data-label="Throughput">{show(t)} Mbps</td>
                  <td data-label="Share of the bandwidth">
                    {percent(t / c.bandwidthMbps)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        The first job gets almost all of its 10 Mbps. The second job has a link
        100 times wider, yet it gets only about 62 percent of it, because the 50
        ms wait is now a big part of a very short transfer. The tiny request
        gets less than 1 percent: a gigabit link moving data at about the pace
        of an old dial-up modem, because it is nearly all waiting.
      </p>

      <h3>Other things that lower throughput</h3>
      <ul>
        <li>
          <strong>Sharing.</strong> Other devices and other people use the same
          link at the same moment.
        </li>
        <li>
          <strong>A slower part on the path.</strong> The bottleneck, such as a
          weak Wi-Fi signal or a busy server, sets the pace for everything.
        </li>
        <li>
          <strong>Overhead.</strong> Every packet carries address information as
          well as your data, so a little of the capacity carries no file
          content.
        </li>
        <li>
          <strong>Lost data.</strong> A packet that is lost must be sent again,
          which uses capacity twice.
        </li>
      </ul>
      <p className={styles.note}>
        A speed test reports a throughput, not the plan&rsquo;s bandwidth. It is
        designed to keep the link busy long enough that the delay is a small
        part of the test, so its result lands close to what the link can carry.
      </p>
    </>
  );
}

/** Go deeper: overhead and resent data. */
export function OverheadDeeper() {
  return (
    <>
      <p>
        Each packet starts with a header: addresses and control information. For
        a typical full-size packet the headers are a few percent of the bytes,
        so a link carrying 100 Mbps of packets delivers a little less than 100
        Mbps of your file. The exact amount depends on the protocols in use;
        later levels show the headers field by field.
      </p>
      <p>
        When a packet is lost, the sender notices and sends it again. Those
        repeated bits used bandwidth but added nothing new, so they lower the
        throughput. A link that loses many packets can have a high bandwidth and
        a poor throughput.
      </p>
    </>
  );
}

/** Go deeper: why one download may not fill a fast, long link. */
export function FillTheLinkDeeper() {
  return (
    <>
      <p>
        A fast link with a long delay is hard to fill. The sender sends some
        data, then must wait for a reply saying it arrived before it is allowed
        to send much more. If it stops and waits too early, the pipe sits partly
        empty while the reply travels back.
      </p>
      <p>
        The next section puts a number on how much data the sender needs to keep
        on the way to avoid that. It is one of the most useful single numbers in
        networking.
      </p>
    </>
  );
}
