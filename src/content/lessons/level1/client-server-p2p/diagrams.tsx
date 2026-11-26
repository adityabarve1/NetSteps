import styles from './lesson.module.css';

// Three small static pictures: client-server, peer-to-peer and a hybrid.
// Static, so they need no motion handling. Words, outline weight and line
// style carry the meaning, not only colour.

/** One server in the middle, four clients each asking it. */
export function ClientServerDiagram() {
  const clients = [
    { x: 40, y: 40 },
    { x: 320, y: 40 },
    { x: 40, y: 160 },
    { x: 320, y: 160 },
  ];
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 200"
        role="img"
        aria-label="Diagram: one server in the middle with four clients around it. Every client has a line to the server, and none has a line to another client."
      >
        {clients.map((c) => (
          <line
            key={`${String(c.x)}-${String(c.y)}`}
            className={styles.dLink}
            x1={c.x}
            y1={c.y}
            x2={180}
            y2={100}
          />
        ))}
        <rect
          className={styles.dServer}
          x={130}
          y={72}
          width={100}
          height={56}
          rx={10}
        />
        <text className={styles.dText} x={180} y={106} textAnchor="middle">
          Server
        </text>
        {clients.map((c) => (
          <g key={`c-${String(c.x)}-${String(c.y)}`}>
            <rect
              className={styles.dPeer}
              x={c.x - 32}
              y={c.y - 18}
              width={64}
              height={36}
              rx={8}
            />
            <text
              className={styles.dSmall}
              x={c.x}
              y={c.y + 5}
              textAnchor="middle"
            >
              Client
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Client-server: every client talks to the server. The clients do not need
        to know about each other.
      </figcaption>
    </figure>
  );
}

const RING = [
  { x: 180, y: 28 },
  { x: 300, y: 92 },
  { x: 254, y: 172 },
  { x: 106, y: 172 },
  { x: 60, y: 92 },
];

/** Five peers, each joined to every other with dashed lines. */
export function PeerToPeerDiagram() {
  const pairs = RING.flatMap((a, i) => RING.slice(i + 1).map((b) => [a, b]));
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 200"
        role="img"
        aria-label="Diagram: five peers in a ring. Each peer has a dashed line to every other peer. There is no server."
      >
        {pairs.map(([a, b]) =>
          a === undefined || b === undefined ? null : (
            <line
              key={`${String(a.x)}-${String(b.x)}-${String(a.y)}-${String(b.y)}`}
              className={styles.dPeerLink}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          ),
        )}
        {RING.map((p) => (
          <g key={`${String(p.x)}-${String(p.y)}`}>
            <rect
              className={styles.dPeer}
              x={p.x - 28}
              y={p.y - 15}
              width={56}
              height={30}
              rx={8}
            />
            <text
              className={styles.dSmall}
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
            >
              Peer
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Peer-to-peer: the computers share with each other directly. Here every
        peer is joined to every other peer, which is the most links a group of
        five can have.
      </figcaption>
    </figure>
  );
}

const THREE = [
  { x: 60, y: 160 },
  { x: 180, y: 160 },
  { x: 300, y: 160 },
];

/** A server that only introduces; the peers share the data themselves. */
export function HybridDiagram() {
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 210"
        role="img"
        aria-label="Diagram: a server at the top with dotted lines to three peers below, labelled introductions. The three peers are joined to each other by dashed lines, labelled the data moves here."
      >
        {THREE.map((p) => (
          <line
            key={`ask-${String(p.x)}`}
            className={styles.dAsk}
            x1={180}
            y1={50}
            x2={p.x}
            y2={p.y - 16}
          />
        ))}
        <line className={styles.dPeerLink} x1={60} y1={160} x2={180} y2={160} />
        <line
          className={styles.dPeerLink}
          x1={180}
          y1={160}
          x2={300}
          y2={160}
        />
        <rect
          className={styles.dServer}
          x={130}
          y={14}
          width={100}
          height={40}
          rx={10}
        />
        <text className={styles.dText} x={180} y={40} textAnchor="middle">
          Server
        </text>
        {THREE.map((p) => (
          <g key={`peer-${String(p.x)}`}>
            <rect
              className={styles.dPeer}
              x={p.x - 28}
              y={p.y - 16}
              width={56}
              height={32}
              rx={8}
            />
            <text
              className={styles.dSmall}
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
            >
              Peer
            </text>
          </g>
        ))}
        <text className={styles.dSmall} x={180} y={96} textAnchor="middle">
          Introductions
        </text>
        <text className={styles.dSmall} x={180} y={196} textAnchor="middle">
          The data moves here
        </text>
      </svg>
      <figcaption>
        A hybrid: the server helps the peers find each other, and the peers then
        share the data directly.
      </figcaption>
    </figure>
  );
}
