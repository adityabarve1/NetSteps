import { Term } from '@/content/components/Term';
import { ReservedSlotsDiagram } from './diagrams';
import styles from './lesson.module.css';

/** Section 2: circuit switching and the old phone network. */
export function CircuitSwitching() {
  return (
    <>
      <p>
        For most of the twentieth century, the telephone network was the biggest
        network in the world. It was built around one idea:{' '}
        <Term id="circuit-switching">circuit switching</Term>. Before you can
        talk, the network builds a <Term id="circuit">circuit</Term>, a path
        from your phone to theirs, and holds it for you until you hang up.
      </p>

      <h3>How a phone call used to work</h3>
      <p>
        Phone lines ran to buildings called telephone exchanges. An exchange
        held equipment that could join one incoming line to one outgoing line.
        Exchanges were linked to other exchanges, so a call could cross a city,
        a country or an ocean. A call had three phases:
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Setup.</strong> You dial. The network finds a path through its
          exchanges and reserves a slice of capacity on every link along it.
          Your friend&rsquo;s phone rings.
        </li>
        <li>
          <strong>Talk.</strong> Your voices flow along the reserved path for as
          long as you like. The slice belongs to your call alone.
        </li>
        <li>
          <strong>Teardown.</strong> You hang up. The network releases the slice
          so another call can use it.
        </li>
      </ol>
      <p>
        If you ever heard a busy signal because the lines were full, that was
        this system saying &ldquo;no free slice right now&rdquo;.
      </p>

      <h3>What a reserved circuit gives you</h3>
      <ul>
        <li>
          <strong>A steady speed.</strong> Your slice is the same size from
          start to finish, so your voice never has to wait behind other callers.
        </li>
        <li>
          <strong>Short, predictable delay.</strong> Data goes straight along
          the path, with no stopping to be sorted.
        </li>
        <li>
          <strong>Everything in order.</strong> There is one path, so what you
          say first arrives first.
        </li>
        <li>
          <strong>Little to add to the data.</strong> The path itself says where
          the data goes, so voice does not need an address attached to every
          piece.
        </li>
      </ul>

      <h3>What a reserved circuit costs</h3>
      <ReservedSlotsDiagram />
      <ul>
        <li>
          <strong>Idle capacity is wasted.</strong> The slice is yours even when
          nobody is speaking. Conversations are full of silence, and while one
          person listens, much of the capacity sits unused and nobody else can
          have it.
        </li>
        <li>
          <strong>Setup takes time.</strong> Nothing can be sent until the
          circuit exists. For a long call that is a small price. For a quick
          message it is a large one.
        </li>
        <li>
          <strong>Callers can be turned away.</strong> When every slice is
          taken, the next caller gets a busy signal, even if some slices are
          empty right now.
        </li>
        <li>
          <strong>One path means one weak spot.</strong> If a link on the path
          fails, the call drops, and a new circuit must be set up.
        </li>
      </ul>
      <p className={styles.note}>
        Circuit switching works well for steady streams that last a while, such
        as a voice call. It works poorly for computer traffic, which tends to
        come in short bursts with long pauses between them.
      </p>
    </>
  );
}

/** Go deeper: how many calls share one wire. */
export function MultiplexingDeeper() {
  return (
    <>
      <p>
        One wire can carry many calls at once if it is divided up. The telephone
        network did this by giving each call a fixed share of the wire for the
        whole call, either a separate band of frequencies or a repeating slot of
        time.
      </p>
      <p>
        In the classic digital phone system, one voice call used a channel of
        64,000 bits per second: the voice was measured 8,000 times a second,
        with 8 bits each time. A link with room for 24 such channels could carry
        24 calls, and the 25th caller got a busy signal. The diagram above is a
        small version of the same idea, with four slots.
      </p>
    </>
  );
}

/** Go deeper: is circuit switching gone? */
export function CircuitToday() {
  return (
    <>
      <p>
        Not entirely, but it has become rare for everyday traffic. Much voice
        now travels as packets for part or all of its journey, as a later
        section explains.
      </p>
      <p>
        The idea of reserving capacity survives where a steady, guaranteed
        connection matters. A company can rent a{' '}
        <Term id="leased-line">leased line</Term>, a connection set aside for
        its use. Some long-distance fibre carries a separate colour of light as
        a dedicated path for one customer. Even on packet networks, engineers
        can mark some traffic as more important so it gets served first, which
        gives a taste of the same guarantee without a full reservation.
      </p>
    </>
  );
}
