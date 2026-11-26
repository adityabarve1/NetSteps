import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import {
  LESSON_NUMBERS as N,
  clientServerBottleneck,
  clientServerSeconds,
  formatSeconds,
} from './logic';

const COUNTS = [1, 2, 3, 5, 10, 20, 50];

const LIMIT_TEXT = {
  'server upload': 'Server upload',
  'client download': 'Client download',
  'peer upload sharing': 'Peer upload sharing',
};

function WorkedTable() {
  return (
    <div data-prose="">
      <table className={styles.table}>
        <caption>
          One 800-megabit file, a server that uploads 100 megabits per second,
          clients that download 50 megabits per second
        </caption>
        <thead>
          <tr>
            <th scope="col">Clients</th>
            <th scope="col">Server must upload</th>
            <th scope="col">Time for everyone</th>
            <th scope="col">What sets the time</th>
          </tr>
        </thead>
        <tbody>
          {COUNTS.map((n) => {
            const p = { ...N, clients: n };
            return (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td data-label="Server must upload">
                  {String(n * N.fileMb)} megabits
                </td>
                <td data-label="Time for everyone">
                  {formatSeconds(clientServerSeconds(p))} seconds
                </td>
                <td data-label="What sets the time">
                  {LIMIT_TEXT[clientServerBottleneck(p)]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Section 3: strengths and weaknesses of client-server, with the numbers. */
export function StrengthsAndWeaknesses() {
  return (
    <>
      <p>
        Client-server is popular because it is simple to run and simple to
        understand. It also has two weak spots. This section lists both, then
        puts numbers on the second one.
      </p>

      <h3>What client-server does well</h3>
      <ul>
        <li>
          <strong>One place to manage.</strong> The service&rsquo;s data, its
          updates and its backups all live on the servers. Fix something once
          and every client benefits.
        </li>
        <li>
          <strong>Control.</strong> The server can check who you are and decide
          what you may see. A bank&rsquo;s server shows you your account and
          nobody else&rsquo;s.
        </li>
        <li>
          <strong>Simple clients.</strong> A phone or an old laptop needs only a
          small program. The heavy work and the big storage stay on the servers.
        </li>
        <li>
          <strong>Predictable.</strong> Clients always know where to ask,
          because the server has a known address and is meant to be always on.
        </li>
      </ul>

      <h3>Where it struggles</h3>
      <ul>
        <li>
          <strong>It can run out of room.</strong> Every client takes a share of
          the server&rsquo;s capacity, which is how much data it can send out
          each second. When too many ask at once, everyone waits. The numbers
          are below.
        </li>
        <li>
          <strong>It has a single point of failure</strong> when only one server
          provides the service. If that server stops, nobody can use the
          service. The last section is about this.
        </li>
        <li>
          <strong>It costs money.</strong> Someone has to buy, power and look
          after the servers, and pay for their fast connections.
        </li>
      </ul>

      <h3>Worked example: sending one file to many clients</h3>
      <p>
        Suppose a server holds one file and many clients want it at once. Speeds
        are measured in megabits per second (Mbps). A{' '}
        <Term id="megabit">megabit</Term> is one million bits, and a bit is a 0
        or a 1. Eight bits make one byte, so our file of 800 megabits is 100
        megabytes. To <Term id="upload">upload</Term> is to send data out; to{' '}
        <Term id="download">download</Term> is to receive it.
      </p>
      <p>
        Our numbers: the file is 800 megabits. The server can upload 100 Mbps.
        Each client can download 50 Mbps. The time for everyone to finish is the
        larger of two times:
      </p>
      <ul>
        <li>
          <strong>The server&rsquo;s turn:</strong> it must send one copy per
          client. That is (clients × 800) ÷ 100 seconds.
        </li>
        <li>
          <strong>One client&rsquo;s limit:</strong> no client can receive
          faster than it downloads. That is 800 ÷ 50 = 16 seconds, however few
          clients there are.
        </li>
      </ul>
      <WorkedTable />
      <p>
        With one client, the client&rsquo;s own download speed is the limit: 16
        seconds. With two clients the two times tie at 16 seconds. From three
        clients on, the server is the busier one, and every extra client adds 8
        seconds. Double the clients, double the wait: 5 clients take 40 seconds
        and 10 take 80. The slowest part, here the server&rsquo;s upload, is the{' '}
        <Term id="bottleneck">bottleneck</Term>, and adding clients cannot help
        it.
      </p>
      <p className={styles.keyline}>
        Client-server time grows in step with the number of clients, once the
        server&rsquo;s upload is what holds things back.
      </p>
    </>
  );
}

/** Go deeper: the model and what it leaves out. */
export function ModelAssumptionsDeeper() {
  return (
    <>
      <p>
        The numbers above come from a textbook model of distribution time. In
        symbols, with file size F (megabits), N clients, server upload u and
        client download d:
      </p>
      <p className={styles.keyline}>
        time = the larger of (N × F ÷ u) and (F ÷ d)
      </p>
      <p>
        It is deliberately idealised. It assumes there is no delay on the links,
        no extra bytes for addresses and error checking, and no congestion
        anywhere else. It assumes the server&rsquo;s upload is shared perfectly
        and that every client starts at the same moment. The only limits are the
        two speeds.
      </p>
      <p>
        Real downloads are slower and messier than this. Use the model to see
        the shape of the problem (time grows with clients), not to predict the
        exact seconds. Level 5 shows how real transfers behave.
      </p>
    </>
  );
}

/** Go deeper: bits and bytes. */
export function BitsAndBytesDeeper() {
  return (
    <>
      <p>
        Internet speeds are quoted in bits per second, and file sizes in bytes.
        That is why the units trip people up.
      </p>
      <ul>
        <li>1 byte = 8 bits. A 100 MB file is 800 megabits.</li>
        <li>
          Mbps (lowercase b) means megabits per second. MB/s (capital B) means
          megabytes per second. A 50 Mbps connection moves at most 6.25 MB/s,
          because 50 ÷ 8 = 6.25.
        </li>
        <li>
          In this course, mega means one million, and KB means 1000 bytes.
        </li>
      </ul>
      <p>
        Check: the file would take 800 ÷ 50 = 16 seconds at 50 Mbps. At 6.25
        MB/s, 100 MB takes 100 ÷ 6.25 = 16 seconds. Same answer, two ways.
      </p>
    </>
  );
}
