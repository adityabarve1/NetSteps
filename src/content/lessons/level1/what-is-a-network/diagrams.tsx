import styles from './lesson.module.css';

type Part = { x: number; label: string[] };

const INSIDE: Part[] = [
  { x: 55, label: ['Router'] },
  { x: 140, label: ['Switch'] },
  { x: 225, label: ['Wi-Fi', 'access', 'point'] },
];

type Host = { x: number; label: string; wireless: boolean };

const HOSTS: Host[] = [
  { x: 14, label: 'Laptop', wireless: false },
  { x: 98, label: 'Printer', wireless: false },
  { x: 192, label: 'Phone', wireless: true },
  { x: 276, label: 'TV', wireless: true },
];

/**
 * A typical home network: the box from the internet provider holds a router,
 * a switch and a Wi-Fi access point; hosts join by cable or by Wi-Fi.
 * Static, so it needs no motion handling.
 */
export function HomeNetworkDiagram() {
  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 360 330"
        role="img"
        aria-label="A home network. The internet provider's line reaches one home router box. Inside the box are a router, a switch and a Wi-Fi access point. A laptop and a printer are joined to the switch by cables. A phone and a TV are joined to the access point by Wi-Fi."
      >
        <rect
          className={styles.dBox}
          x={70}
          y={8}
          width={220}
          height={40}
          rx={20}
        />
        <text className={styles.dText} x={180} y={33} textAnchor="middle">
          Internet provider
        </text>
        <line className={styles.dLink} x1={180} y1={48} x2={180} y2={80} />
        <text className={styles.dSmall} x={190} y={69}>
          line from the street
        </text>

        <rect
          className={styles.dBox}
          x={40}
          y={80}
          width={280}
          height={104}
          rx={12}
        />
        <text className={styles.dText} x={180} y={102} textAnchor="middle">
          Home router box
        </text>
        {INSIDE.map((part) => (
          <g key={part.x}>
            <rect
              className={styles.dBox}
              x={part.x}
              y={112}
              width={80}
              height={60}
              rx={8}
            />
            {part.label.map((line, i) => (
              <text
                key={line}
                className={part.label.length > 1 ? styles.dSmall : styles.dText}
                x={part.x + 40}
                y={(part.label.length > 1 ? 131 : 147) + i * 16}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
          </g>
        ))}
        {HOSTS.map((host) => (
          <g key={host.label}>
            <line
              className={host.wireless ? styles.dRadio : styles.dLink}
              x1={host.wireless ? 265 : 180}
              y1={172}
              x2={host.x + 35}
              y2={250}
            />
            <rect
              className={styles.dBox}
              x={host.x}
              y={250}
              width={70}
              height={34}
              rx={6}
            />
            <text
              className={styles.dText}
              x={host.x + 35}
              y={272}
              textAnchor="middle"
            >
              {host.label}
            </text>
          </g>
        ))}
        <text className={styles.dSmall} x={180} y={316} textAnchor="middle">
          Solid line: cable. Dashed line: Wi-Fi.
        </text>
      </svg>
      <figcaption>
        One box, several jobs. The cables and the Wi-Fi are the links; the
        laptop, printer, phone and TV are the hosts.
      </figcaption>
    </figure>
  );
}
