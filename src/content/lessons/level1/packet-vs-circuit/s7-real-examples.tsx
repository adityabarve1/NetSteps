import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Example = { what: string; how: string };

const EXAMPLES: Example[] = [
  {
    what: 'Opening a web page, sending email, downloading a file',
    how: 'Packets. This is the ordinary internet.',
  },
  {
    what: 'A video call on your phone or laptop',
    how: 'Packets, sent in small pieces many times a second.',
  },
  {
    what: 'Streaming a film',
    how: 'Packets. The player keeps a short buffer so it can ride out delays.',
  },
  {
    what: 'A call on a modern mobile network (4G and 5G)',
    how: 'Voice is carried as packets, with priority so it stays smooth.',
  },
  {
    what: 'A call on an old landline or on 2G and 3G mobile',
    how: 'Often circuit switching, with a reserved channel for the call.',
  },
  {
    what: 'A company renting a leased line between two offices',
    how: 'A reserved connection, much like a permanent circuit.',
  },
];

/** Section 7: real examples. */
export function RealExamples() {
  return (
    <>
      <p>
        Every day you use both ideas, usually without knowing it. The internet
        is built on packets, and the telephone is the best-known example of the
        older way, though even the telephone has changed.
      </p>

      <h3>The internet: packets all the way</h3>
      <p>
        Everything that crosses the internet is cut into packets. A web page, a
        photo, a video and an email are all sent as packets that routers forward
        hop by hop. The internet does not reserve a path for you. That is why
        millions of people can share its links, and also why your speed can
        change from minute to minute.
      </p>

      <h3>The telephone, then and now</h3>
      <p>
        Traditional landline calls were circuit switched, as the second section
        described. Over the last decades, telephone companies have moved much of
        their networks onto packet technology, because it is cheaper to run one
        packet network than two separate ones. A call on a modern mobile network
        is carried as packets, and so is a call made through an app. The sound
        is cut into short pieces, each one is sent as a packet, and the
        receiving phone plays them back in order.
      </p>
      <p>
        Calls sent as packets over the internet are often called{' '}
        <Term id="voip">VoIP</Term>, short for &ldquo;voice over internet
        protocol&rdquo;. Some networks still use circuits for voice, and some
        keep a circuit-like guarantee by giving voice packets priority. So the
        honest picture is a mix and not a clean switch from one to the other.
      </p>

      <h3>Who uses what</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>How some everyday things travel</caption>
          <thead>
            <tr>
              <th scope="col">What you do</th>
              <th scope="col">How it usually travels</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((e) => (
              <tr key={e.what}>
                <th scope="row">{e.what}</th>
                <td data-label="How it usually travels">{e.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        You can see the routers that your own packets pass through. The
        &ldquo;On your own computer&rdquo; exercise later in this lesson shows
        how, with one safe command.
      </p>
    </>
  );
}

/** Go deeper: voice as packets. */
export function VoiceAsPacketsDeeper() {
  return (
    <>
      <p>
        Take the classic voice rate of 64,000 bits per second. If each packet
        holds 20 milliseconds of sound, its payload is 64,000 × 0.02 = 1,280
        bits, which is 160 bytes. A packet is sent every 20 milliseconds.
      </p>
      <p>
        The headers on voice packets usually add about 40 bytes. That is 40 out
        of 200 bytes, or 20 percent overhead, which is the price of the
        flexibility. The receiving phone also holds a few packets in a short
        buffer before playing them. That smooths out the changing delays from
        queues, at the cost of a little extra delay.
      </p>
    </>
  );
}

/** Go deeper: asking for a better lane. */
export function PriorityDeeper() {
  return (
    <>
      <p>
        By default, a packet network treats every packet alike and does its
        best. Engineers can mark some packets, such as voice, as more important.
        A router with a marked packet in its queue sends it before the unmarked
        ones.
      </p>
      <p>
        This is not a reservation: the link is still shared. But it gives voice
        the short, steady delay it needs, at the cost of making the other
        traffic wait a little longer when the link is busy. The idea is called
        quality of service. This course only names it, and you will meet it
        again if you work with networks.
      </p>
    </>
  );
}
