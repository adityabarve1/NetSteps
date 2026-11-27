import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { formatSeconds, totalSeconds } from './logic';

const REQUESTS = 20;
const RTT_MS = 100;
const BANDWIDTH_MBPS = 1000;
const ONE_KB_MB = 0.008;

// One request and its answer: the answer cannot start until the request has
// arrived, so the wait before it is a whole round trip. The answer is 1 kB.
const oneExchange = totalSeconds({
  fileMb: ONE_KB_MB,
  bandwidthMbps: BANDWIDTH_MBPS,
  latencyMs: RTT_MS,
});
// Twenty of them one after another.
const oneByOne = REQUESTS * oneExchange;
// The same 20 kB asked for and delivered in a single exchange.
const allAtOnce = totalSeconds({
  fileMb: ONE_KB_MB * REQUESTS,
  bandwidthMbps: BANDWIDTH_MBPS,
  latencyMs: RTT_MS,
});

/** Section 6: why small requests feel slow. */
export function SmallRequests() {
  return (
    <>
      <p>
        A web page is rarely one big file. It is a page plus many small pieces:
        styles, scripts, small pictures and data. Your browser asks for them
        with many separate requests. Each request is tiny, so the pipe hardly
        matters. What matters is how many times the browser must wait for the
        road.
      </p>

      <h3>Each question costs a round trip</h3>
      <p>
        A request is a question, and the answer cannot start until the question
        has arrived. So each request-and-answer costs at least one round-trip
        time, even if the answer is a single kilobyte. Take a connection of 1000
        Mbps with a 100 ms round trip to a distant server:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            20 kilobytes of small pieces over 1000 Mbps with a 100 ms round trip
            (a simplified model)
          </caption>
          <thead>
            <tr>
              <th scope="col">How it is asked for</th>
              <th scope="col">Round trips waited</th>
              <th scope="col">Total time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                20 separate 1-kilobyte requests, one after another
              </th>
              <td data-label="Round trips waited">{REQUESTS}</td>
              <td data-label="Total time">{formatSeconds(oneByOne)} seconds</td>
            </tr>
            <tr>
              <th scope="row">The same 20 kilobytes in one request</th>
              <td data-label="Round trips waited">1</td>
              <td data-label="Total time">
                {formatSeconds(allAtOnce)} seconds
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The data is the same and the pipe is the same, yet one way takes twenty
        times longer. Nothing about the pipe explains it. The wait for the road
        happened twenty times instead of once. In a real browser the picture is
        kinder, because it asks for several things at once and reuses open
        connections. But every wait that cannot be avoided is still one trip
        along the road.
      </p>

      <h3>What actually helps</h3>
      <ul>
        <li>
          <strong>Fewer round trips.</strong> Bundle small pieces together, ask
          for several at once, and keep connections open.
        </li>
        <li>
          <strong>A shorter road.</strong> A service that keeps copies of its
          content near you, as a <Term id="cdn">CDN</Term> does, answers from
          close by, so each round trip is short.
        </li>
        <li>
          <strong>Saved copies.</strong> A copy your browser already holds needs
          no trip at all.
        </li>
      </ul>
      <p className={styles.note}>
        The same idea explains why games and video calls care so much about
        latency. They send small messages again and again, and each one is
        useful only if it arrives soon. Many people start to notice lag in a
        fast game once the round trip reaches roughly 100 ms, though it varies
        with the game and the person.
      </p>
    </>
  );
}

/** Go deeper: connection set-up. */
export function SetupDeeper() {
  return (
    <>
      <p>
        Before a browser can ask a secure website for a page, the two computers
        usually exchange a few set-up messages first. Each exchange costs a
        round trip. The exact number depends on the protocols and their
        versions, and newer versions work to cut it down.
      </p>
      <p>
        The result: the first request to a new server has more waiting in it
        than later ones. A later level takes these protocols apart and counts
        the round trips one by one.
      </p>
    </>
  );
}

/** Go deeper: caches and CDNs. */
export function CacheDeeper() {
  return (
    <>
      <p>
        A cache is a saved copy kept closer to where it is needed. Your browser
        keeps a cache on your own computer, so pictures you have seen before
        load with no network trip. A CDN keeps caches in many cities, so the
        copy you fetch is often only a short distance away.
      </p>
      <p>
        Both tricks work on latency. Neither makes the pipe wider; they shorten
        the road or skip it entirely.
      </p>
    </>
  );
}
