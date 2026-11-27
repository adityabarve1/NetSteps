import type { DeviceKind } from '@/netcore/network';
import styles from './BuilderCanvas.module.css';

/** A simple drawing of a computer, switch or server, centred on (0, -14). Decorative. */
export function DeviceIcon({ kind }: { kind: DeviceKind }) {
  if (kind === 'switch') {
    return (
      <g aria-hidden="true">
        <rect
          className={styles.iconBody}
          x={-22}
          y={-26}
          width={44}
          height={20}
          rx={4}
        />
        {[-14, -5, 4, 13].map((x) => (
          <rect
            key={x}
            className={styles.iconPort}
            x={x - 3}
            y={-20}
            width={6}
            height={8}
            rx={1}
          />
        ))}
      </g>
    );
  }
  if (kind === 'server') {
    return (
      <g aria-hidden="true">
        <rect
          className={styles.iconBody}
          x={-16}
          y={-32}
          width={32}
          height={14}
          rx={3}
        />
        <rect
          className={styles.iconBody}
          x={-16}
          y={-16}
          width={32}
          height={14}
          rx={3}
        />
        <circle className={styles.iconPort} cx={-9} cy={-25} r={2.5} />
        <circle className={styles.iconPort} cx={-9} cy={-9} r={2.5} />
        <path className={styles.iconLine} d="M-1 -25 H10 M-1 -9 H10" />
      </g>
    );
  }
  return (
    <g aria-hidden="true">
      <rect
        className={styles.iconBody}
        x={-20}
        y={-32}
        width={40}
        height={25}
        rx={3}
      />
      <path className={styles.iconLine} d="M0 -7 V-1 M-9 -1 H9" />
    </g>
  );
}
