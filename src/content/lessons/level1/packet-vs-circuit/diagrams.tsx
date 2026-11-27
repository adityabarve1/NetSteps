import styles from './lesson.module.css';

// Two small static pictures. Static, so they need no motion handling. Words
// and line style carry the meaning, not only colour.

/** A link with four reserved slots: three calls talking, one silent. */
export function ReservedSlotsDiagram() {
  const calls = [
    { name: 'Call 1', talking: true },
    { name: 'Call 2', talking: false },
    { name: 'Call 3', talking: true },
    { name: 'Call 4', talking: true },
  ];
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 190"
        role="img"
        aria-label="Diagram: one link split into four reserved slots, one for each call. Calls 1, 3 and 4 are talking. Call 2 is silent, so its slot is reserved but empty. A fifth caller would get a busy signal."
      >
        <text className={styles.dText} x={180} y={20} textAnchor="middle">
          One link, four reserved slots
        </text>
        {calls.map((c, i) => (
          <g key={c.name}>
            <rect
              className={c.talking ? styles.dServer : styles.dEmpty}
              x={20 + i * 82}
              y={40}
              width={72}
              height={60}
              rx={8}
            />
            <text
              className={styles.dText}
              x={56 + i * 82}
              y={68}
              textAnchor="middle"
            >
              {c.name}
            </text>
            <text
              className={styles.dSmall}
              x={56 + i * 82}
              y={88}
              textAnchor="middle"
            >
              {c.talking ? 'talking' : 'silent, still held'}
            </text>
          </g>
        ))}
        <text className={styles.dText} x={180} y={140} textAnchor="middle">
          Caller 5: busy signal
        </text>
        <text className={styles.dSmall} x={180} y={162} textAnchor="middle">
          All four slots are taken, even though one is empty.
        </text>
      </svg>
      <figcaption>
        In circuit switching a slot belongs to its call until the call ends,
        talking or not.
      </figcaption>
    </figure>
  );
}

/** A packet drawn as a header block followed by a payload block. */
export function PacketAnatomyDiagram() {
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 150"
        role="img"
        aria-label="Diagram: one packet drawn as two blocks side by side. The small block on the left is the header: from, to, packet number and size. The large block on the right is the payload, one piece of your message."
      >
        <rect className={styles.dPeer} x={20} y={40} width={110} height={56} />
        <rect className={styles.dBox} x={130} y={40} width={210} height={56} />
        <text className={styles.dText} x={75} y={64} textAnchor="middle">
          Header
        </text>
        <text className={styles.dSmall} x={75} y={84} textAnchor="middle">
          from, to, number
        </text>
        <text className={styles.dText} x={235} y={64} textAnchor="middle">
          Payload
        </text>
        <text className={styles.dSmall} x={235} y={84} textAnchor="middle">
          one piece of your message
        </text>
        <text className={styles.dSmall} x={180} y={128} textAnchor="middle">
          One packet
        </text>
      </svg>
      <figcaption>
        The header says where the packet is from, where it is going and which
        piece it is. The payload is the piece itself.
      </figcaption>
    </figure>
  );
}
