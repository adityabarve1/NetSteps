import styles from './lesson.module.css';

// An illustration, not real output: the hops, times and addresses depend on
// where you are. The addresses are from the documentation ranges (RFC 5737),
// and the home router address is a typical private one.
const WINDOWS = `Tracing route to example.com [203.0.113.80]
over a maximum of 30 hops:

  1    <1 ms    <1 ms     1 ms  192.168.1.1
  2     9 ms     8 ms     9 ms  198.51.100.1
  3     *        *        *     Request timed out.
  4    14 ms    13 ms    14 ms  198.51.100.77
  5    21 ms    20 ms    22 ms  203.0.113.9
  6    24 ms    23 ms    24 ms  203.0.113.80

Trace complete.`;

const UNIX = `traceroute to example.com (203.0.113.80), 30 hops max, 60 byte packets
 1  192.168.1.1 (192.168.1.1)  1.021 ms  0.874 ms  0.842 ms
 2  198.51.100.1 (198.51.100.1)  9.310 ms  8.955 ms  9.120 ms
 3  * * *
 4  198.51.100.77 (198.51.100.77)  14.200 ms  13.870 ms  14.050 ms
 5  203.0.113.9 (203.0.113.9)  21.412 ms  20.998 ms  21.640 ms
 6  203.0.113.80 (203.0.113.80)  24.115 ms  23.760 ms  24.030 ms`;

const code = (text: string) => <code className={styles.command}>{text}</code>;

/** "On your own computer": see the routers your packets pass through. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. This exercise sends a few
        small test packets to a public website and shows you the routers they
        pass through on the way. It reads only, and it changes nothing on your
        computer.
      </p>

      <h3>Run a trace</h3>
      <ol className={styles.steps}>
        <li>
          Open a terminal. On Windows, search for{' '}
          <strong>Command Prompt</strong>. On macOS, open{' '}
          <strong>Terminal</strong>. On Linux, open your terminal program.
        </li>
        <li>
          On Windows, type {code('tracert example.com')} and press Enter. On
          macOS or Linux, type {code('traceroute example.com')} and press Enter.
          (Some Linux systems need the traceroute tool to be installed first.)
        </li>
        <li>
          Wait. Each line appears a moment after the one before, and the whole
          trace can take up to a minute. To stop it early, press Ctrl and C
          together.
        </li>
      </ol>
      <p>
        Your output will look something like this, though yours will differ:
      </p>
      <p>On Windows:</p>
      <pre className={styles.output}>{WINDOWS}</pre>
      <p>On macOS or Linux:</p>
      <pre className={styles.output}>{UNIX}</pre>

      <h3>What each line means</h3>
      <ul>
        <li>
          <strong>Each numbered line is one router</strong> that your packets
          passed through. It is one hop. The line number is the hop count so
          far, and the last line is the website&rsquo;s own address.
        </li>
        <li>
          <strong>Line 1 is usually your own router</strong>, often an address
          that starts with 192.168 or 10. Your packets leave your home or office
          network through it.
        </li>
        <li>
          <strong>Three times per line</strong> are three test packets sent to
          that router. Each time is how long that packet took to get there and
          back, in milliseconds (ms). Times often grow as the hops get farther
          away, though not always.
        </li>
        <li>
          <strong>A line of * * * or &ldquo;Request timed out&rdquo;</strong>{' '}
          means that router did not answer your test packets. Many routers are
          set to stay quiet. Your packets still passed through it, as the lines
          after it show. It does not mean the trace failed.
        </li>
      </ul>
      <p>
        Run the same command again later, or to a different website. The route
        may change, because routers choose paths as conditions change. That is
        packet switching at work: nobody reserved this road for you, and the
        packets for another website may take a different one.
      </p>
      <p>
        Some networks block these test packets, so a trace may show only stars
        after the first few lines. If that happens, try another website or
        another network you own, and do not try to get around the block.
      </p>
    </>
  );
}
