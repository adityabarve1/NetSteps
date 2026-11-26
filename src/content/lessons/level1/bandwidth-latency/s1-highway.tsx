import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { formatSeconds, totalSeconds } from './logic';

// Two links and two jobs. Every time in the table comes from totalSeconds, so
// the numbers in the text and the logic tests cannot drift apart.
const LINK_A = { bandwidthMbps: 1000, latencyMs: 100 };
const LINK_B = { bandwidthMbps: 10, latencyMs: 2 };
const REQUEST_MB = 0.008; // 1 kilobyte
const MOVIE_MB = 8000; // 1 gigabyte

const seconds = (fileMb: number, link: typeof LINK_A) =>
  `${formatSeconds(totalSeconds({ fileMb, ...link }))} seconds`;

/** Section 1: two numbers describe every link. */
export function TwoNumbers() {
  return (
    <>
      <p>
        When people say &ldquo;fast internet&rdquo;, they mix up two different
        ideas. Every link between two computers has two separate numbers, and
        they answer two separate questions.
      </p>

      <h3>The two questions</h3>
      <ul>
        <li>
          <strong>How much can the link carry each second?</strong> That is its{' '}
          <Term id="bandwidth">bandwidth</Term>. In the highway picture it is
          the number of lanes: how wide the road is.
        </li>
        <li>
          <strong>How long does one message take to get across?</strong> That is
          its <Term id="latency">latency</Term>. In the picture it is the length
          of the road: how long the trip takes for a single car.
        </li>
      </ul>
      <p>
        Bandwidth is measured in bits per second, such as megabits per second
        (Mbps). Latency is measured in time, usually milliseconds (ms, a
        thousandth of a second). A <em>higher</em> bandwidth is better. A{' '}
        <em>lower</em> latency is better.
      </p>

      <h3>Two links, two jobs</h3>
      <p>
        Here are two made-up links. Link A is a wide road that is also very
        long: 1000 Mbps with 100 ms of latency, like a long-distance connection
        with plenty of capacity. Link B is a narrow road that is very short: 10
        Mbps with 2 ms, like a small office whose server is in the next room.
        Which is &ldquo;faster&rdquo;? It depends on what you send.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            Time until everything has arrived, for two jobs on two links (delay
            plus sending time)
          </caption>
          <thead>
            <tr>
              <th scope="col">The job</th>
              <th scope="col">Link A: 1000 Mbps, 100 ms</th>
              <th scope="col">Link B: 10 Mbps, 2 ms</th>
              <th scope="col">Which is quicker</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A tiny request (1 kilobyte)</th>
              <td data-label="Link A">{seconds(REQUEST_MB, LINK_A)}</td>
              <td data-label="Link B">{seconds(REQUEST_MB, LINK_B)}</td>
              <td data-label="Which is quicker">Link B, more than 35 times</td>
            </tr>
            <tr>
              <th scope="row">A big file (1 gigabyte)</th>
              <td data-label="Link A">{seconds(MOVIE_MB, LINK_A)}</td>
              <td data-label="Link B">{seconds(MOVIE_MB, LINK_B)}</td>
              <td data-label="Which is quicker">Link A, almost 100 times</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The wide road wins when there is a lot to carry. The short road wins
        when there is almost nothing to carry. Neither number tells you the
        whole story alone. (The tiny request on link B takes about 2.8
        milliseconds, which the table rounds to 0.003 seconds.)
      </p>
      <p className={styles.note}>
        Everything in this lesson comes back to one small formula:{' '}
        <strong>total time = latency + (file size &divide; bandwidth)</strong>.
        The first part is the wait for the road. The second part is the time to
        push the whole file through the pipe. The simulation below shows which
        part matters when.
      </p>
    </>
  );
}

/** Go deeper: where each number is measured. */
export function MeasuredDeeper() {
  return (
    <>
      <p>
        You measure the two numbers in different ways. Bandwidth is a capacity
        figure: a plan or a cable is rated for it, and a speed test estimates it
        by moving a lot of data for a few seconds. Latency is a timing figure:
        you send one small message and time it, which is what the{' '}
        <code className={styles.command}>ping</code> command does later in this
        lesson.
      </p>
      <p>
        That is why one speed test can show 300 Mbps while a ping to a game
        server shows 60 ms. Both are true at once. They describe different
        things about the same connection.
      </p>
    </>
  );
}

/** Go deeper: why the word "speed" causes trouble. */
export function WhySpeedConfusingDeeper() {
  return (
    <>
      <p>
        &ldquo;Speed&rdquo; sounds like one number, but it is used for both.
        Internet companies say &ldquo;speed&rdquo; for bandwidth, because it is
        the number that sells plans and is simple to advertise. Gamers say
        &ldquo;speed&rdquo; for how quickly something responds, which is
        latency.
      </p>
      <p>
        In this course we avoid the bare word. We say <em>bandwidth</em> when we
        mean how much per second, and <em>latency</em> when we mean how long one
        trip takes. When you hear &ldquo;speed&rdquo;, ask which of the two the
        person means.
      </p>
    </>
  );
}
