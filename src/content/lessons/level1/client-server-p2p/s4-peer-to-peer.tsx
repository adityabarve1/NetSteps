import { Term } from '@/content/components/Term';
import { PeerToPeerDiagram } from './diagrams';
import styles from './lesson.module.css';
import { LESSON_NUMBERS as N, formatSeconds, p2pSeconds } from './logic';
import { DistributionSim } from './sim';

/** Section 4: peer-to-peer, and the primary simulation. */
export function PeerToPeer() {
  const slowPeers = formatSeconds(
    p2pSeconds({ ...N, peers: 10, peerUpMbps: 1 }),
  );
  return (
    <>
      <p>
        In a restaurant, the diners cannot cook. At a potluck, everyone brings a
        dish and everyone eats. That second picture is{' '}
        <Term id="peer-to-peer">peer-to-peer</Term>, often shortened to P2P.
      </p>

      <h3>Everyone is both client and server</h3>
      <p>
        In a P2P network each computer is a <Term id="peer">peer</Term>. A peer
        asks other peers for data, and it also answers when others ask it. It
        plays both roles at once. In a real swarm of peers, no one peer is
        essential: if one leaves, the others carry on.
      </p>
      <p>
        Our model still needs a starting point. It begins with one computer that
        holds the whole file: the original source, which uploads at 100 Mbps,
        like the server before. The peers then help each other on top of that,
        so the original source is no longer the only sender.
      </p>
      <PeerToPeerDiagram />
      <p>
        P2P is not a different kind of cable or device. It is a way of
        organising the programs. The same ordinary computers and links are used.
      </p>

      <h3>Why it copes with a crowd</h3>
      <p>
        In client-server, each new client only adds demand, because the server
        has to upload to every one of them. In P2P, each new peer adds demand
        and also adds supply, because it can pass on what it has already
        received. The original source keeps uploading too.
      </p>
      <p>
        Our numbers show it. Every peer uploads at 10 Mbps. With 10 peers, the
        original source and the peers can together upload 100 + 10 × 10 = 200
        Mbps. The 10 copies of the 800-megabit file add up to 8000 megabits, so
        the time is 8000 ÷ 200 = 40 seconds. Client-server needed 80.
      </p>

      <h3>Watch the same file go out both ways</h3>
      <p>
        The simulation sends the 800-megabit file to 1, 5 and 10 computers,
        first client-server, then peer-to-peer. The time in each step comes from
        the formulas, so you can check it by hand. Press <strong>Next</strong>{' '}
        or <strong>Play</strong>.
      </p>
      <DistributionSim />
      <p>Notice three things:</p>
      <ul>
        <li>
          With one computer, both ways take 16 seconds. P2P gives no gain when
          there is nobody to share with.
        </li>
        <li>
          Client-server time doubles from 5 to 10 clients (40 to 80 seconds).
          Peer-to-peer time rises from about 26.7 to 40 seconds: slower, but not
          twice as slow.
        </li>
        <li>
          The dashed lines between peers are the difference. They are extra
          paths that carry data, so the server is not the only sender.
        </li>
      </ul>

      <h3>Where peer-to-peer struggles</h3>
      <ul>
        <li>
          <strong>Peers come and go.</strong> A peer that switches off takes its
          pieces with it, so the program must find another source.
        </li>
        <li>
          <strong>Trust.</strong> Anyone can join, so a peer may send bad data.
          P2P programs check what they receive.
        </li>
        <li>
          <strong>It depends on how much peers upload.</strong> Many home
          connections upload more slowly than they download. If the peers can
          upload only 1 Mbps each, the same 10 peers need {slowPeers} seconds,
          almost as long as client-server.
        </li>
        <li>
          <strong>Finding each other.</strong> Peers need some way to learn who
          else is online. That job often goes to a server, which leads to the
          next section.
        </li>
      </ul>
      <p className={styles.note}>
        P2P is a technique, like a hammer: whether it is used legally depends on
        what people do with it. What they share can be allowed or not; the
        technique itself is neither.
      </p>
    </>
  );
}

/** Go deeper: how swarming works. */
export function SwarmingDeeper() {
  return (
    <>
      <p>
        Programs such as BitTorrent cut a file into many pieces. Each peer asks
        the others for the pieces it lacks and offers the pieces it has. A group
        of peers sharing one file at the same time is called a{' '}
        <Term id="swarm">swarm</Term>.
      </p>
      <ul>
        <li>
          <strong>Pieces arrive from many peers at once.</strong> One slow peer
          does not hold up the download.
        </li>
        <li>
          <strong>Each piece is checked.</strong> The file&rsquo;s description
          holds a fingerprint (a hash) for every piece, so a damaged or false
          piece is thrown away and fetched again.
        </li>
        <li>
          <strong>Rare pieces first.</strong> A peer often asks first for the
          piece that few others have, so that no piece disappears if its owner
          leaves.
        </li>
        <li>
          <strong>Finding the swarm.</strong> A server called a tracker, or a
          shared lookup system spread over the peers, tells a newcomer who is in
          the swarm.
        </li>
      </ul>
    </>
  );
}

/** Go deeper: the P2P formula and its limits. */
export function P2pFormulaDeeper() {
  return (
    <>
      <p>
        The time for P2P is the largest of three numbers, with file size F, N
        peers, server upload u, peer upload u<sub>p</sub> and peer download d:
      </p>
      <p className={styles.keyline}>
        time = the largest of F ÷ u, F ÷ d and N × F ÷ (u + N × u<sub>p</sub>)
      </p>
      <ul>
        <li>
          F ÷ u: the server must send every bit at least once, so the file
          cannot arrive faster than it leaves the server.
        </li>
        <li>F ÷ d: no peer can receive faster than it downloads.</li>
        <li>
          N × F ÷ (u + N × u<sub>p</sub>): all N copies have to be uploaded by
          somebody, and the total upload available is u + N × u<sub>p</sub>.
        </li>
      </ul>
      <p>
        With our numbers the third term is 8000 ÷ 200 = 40 seconds for 10 peers.
        As N grows it gets close to F ÷ u<sub>p</sub> = 800 ÷ 10 = 80 seconds
        and never reaches it. That is why P2P time does not keep growing in step
        with the crowd the way client-server time does.
      </p>
      <p>
        The same assumptions as before apply: no delay, no overhead, perfect
        sharing, no congestion. Real swarms are slower, and they depend on peers
        staying online and being willing to upload.
      </p>
    </>
  );
}
