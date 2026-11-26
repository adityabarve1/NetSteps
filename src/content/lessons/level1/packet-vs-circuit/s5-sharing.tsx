import styles from './lesson.module.css';
import { SwitchingSim } from './sim';
import { overloadChance } from './sharing';

const CAPACITY = 10;
const ACTIVE_SHARE = 0.1;
const USERS = [10, 20, 35, 50];

// The chance as a short phrase. Computed from `overloadChance`, so the table,
// the text and the tests agree.
function chanceWords(users: number): string {
  const p = overloadChance(users, CAPACITY, ACTIVE_SHARE);
  if (p === 0) return 'never: there are no more users than shares';
  const percent = p * 100;
  if (percent < 0.001) return 'under 0.001 percent of the time';
  return `${percent.toPrecision(2)} percent of the time`;
}

/** Section 5: why packets share links efficiently. */
export function SharingLinks() {
  return (
    <>
      <p>
        The big advantage of packets is not speed. It is how well they share.
        The reason is that most computer traffic comes in bursts.
      </p>

      <h3>Traffic comes in bursts</h3>
      <p>
        Open a web page. A burst of data arrives in a second or two. Then you
        read for half a minute and almost nothing moves. Then you click and
        another burst comes. A person using a computer is often quiet on the
        network between bursts.
      </p>
      <p>
        With circuit switching, that silence is expensive: the reserved capacity
        sits unused between bursts, and nobody else can use it. With packets,
        nothing is reserved. When you are quiet, your share of the link is free,
        and other people&rsquo;s packets use it.
      </p>

      <h3>A worked example: one shared link</h3>
      <p>
        A link can carry {CAPACITY} megabits per second. Each user needs 1
        megabit per second while active, and is active only 10 percent of the
        time.
      </p>
      <ul>
        <li>
          <strong>Circuit switching</strong> must reserve 1 megabit per second
          for each user, active or not. The link holds {CAPACITY} reservations,
          so it can serve only {CAPACITY} users.
        </li>
        <li>
          <strong>Packet switching</strong> uses capacity only when someone is
          active. On average 10 percent of 35 users is 3.5 users, far below the{' '}
          {CAPACITY} that fit. The link is overloaded only when more than{' '}
          {CAPACITY} happen to be active at the same moment.
        </li>
      </ul>
      <p>
        How often does that happen? This table works it out, assuming users act
        independently of one another:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            More than {CAPACITY} users active at once (each active 10 percent of
            the time)
          </caption>
          <thead>
            <tr>
              <th scope="col">Users on the link</th>
              <th scope="col">Link is overloaded</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((n) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td data-label="Link is overloaded">{chanceWords(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        With 35 users, packet switching serves more than three times as many
        people as circuit switching, and the link is overloaded for only a tiny
        slice of the time. That is the efficiency that made packets win for
        data.
      </p>

      <h3>What happens when too many are active at once</h3>
      <p>
        A circuit network says no up front: a busy signal. A packet network says
        yes to everyone, and then pays when too many send together. Packets pile
        up in the routers&rsquo; queues, delay grows, and if a queue fills,
        packets are dropped. This situation is called{' '}
        <strong>congestion</strong>. It makes everything slower for everyone for
        a while, instead of cutting off some callers completely.
      </p>
      <p className={styles.note}>
        Packet switching trades a guarantee for efficiency. You are not promised
        a steady speed, but the network can carry far more users.
      </p>

      <h3>Packets can go around a failure</h3>
      <p>
        Each packet is handled on its own, so routers can change their minds
        between one packet and the next. If a link breaks, they stop sending
        packets that way and use another route. A circuit stays on its one
        reserved path, so the path&rsquo;s failure is the call&rsquo;s failure.
        Step through the simulation to watch both. First it sends a message as
        packets. Then it sets up a circuit call over the same network. Then it
        breaks a link and shows what each method does.
      </p>
      <SwitchingSim />
      <p>Notice three things:</p>
      <ul>
        <li>
          Packets 1 to 6 left in order but arrived in a different order, and the
          numbers fixed it. The packets were not tied to a road.
        </li>
        <li>
          The reserved route stayed busy for one call, and the other route sat
          idle. The call could not use it.
        </li>
        <li>
          After the break, the call dropped and the message finished. The
          routers moved the remaining packets to the road that still worked.
        </li>
      </ul>
    </>
  );
}

/** Go deeper: the idea has a name and a catch. */
export function StatisticalDeeper() {
  return (
    <>
      <p>
        Sharing a link among bursty users, and counting on them not all being
        active together, is called <em>statistical multiplexing</em>. The table
        used a standard counting method (the binomial distribution) with a
        simple assumption: each user is active 10 percent of the time,
        independently.
      </p>
      <p>
        Real traffic does not always follow that. When a big game or film is
        released, many people download at once, and the independence breaks
        down. Engineers measure real traffic and add spare capacity for the busy
        hours instead of trusting a single number.
      </p>
    </>
  );
}

/** Go deeper: who repairs losses. */
export function LossDeeper() {
  return (
    <>
      <p>
        When a packet is dropped, something has to notice. For web pages, email
        and file downloads, the computers at the two ends keep track of packet
        numbers, and the sender sends the missing ones again. The transport
        lessons in Level 5 show how: acknowledgements, retransmission and
        congestion control.
      </p>
      <p>
        For a live call, a late packet may be worth nothing, because the moment
        has passed. Some call software skips the missing sound instead of
        waiting, and that is why a bad connection makes a voice crackle rather
        than pausing the call.
      </p>
    </>
  );
}
