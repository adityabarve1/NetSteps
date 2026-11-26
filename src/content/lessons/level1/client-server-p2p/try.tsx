import { useId, useState } from 'react';
import { cx } from '@/lib/cx';
import {
  LESSON_NUMBERS as N,
  MAX_COUNT,
  MIN_COUNT,
  clampCount,
  compareText,
  describeLimit,
  formatSeconds,
  report,
} from './logic';
import styles from './try.module.css';

// The longest possible time is client-server with 50 computers; the bars use
// that as a full bar, so they grow and shrink as the slider moves.
const FULL_BAR = report(MAX_COUNT).clientServer;
const BAR_X = 8;
const BAR_W = 384;

function barWidth(seconds: number): number {
  return Math.max(4, (seconds / FULL_BAR) * BAR_W);
}

/**
 * Try it: "How long will everyone wait?" A slider sets how many computers ask
 * for the file; the pure `report` gives both times and both bottlenecks.
 */
export function WaitTimes() {
  const id = useId();
  const [count, setCount] = useState(10);
  const r = report(count);

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>How long will everyone wait?</h3>
      <p>
        Move the slider to change how many computers ask for the same file at
        the same time. Watch both times, and which part of the model sets each
        one.
      </p>
      <div className={styles.control}>
        <label htmlFor={id}>Computers asking for the file</label>
        <input
          id={id}
          type="range"
          min={MIN_COUNT}
          max={MAX_COUNT}
          step={1}
          value={r.count}
          onChange={(e) => {
            setCount(clampCount(Number(e.target.value)));
          }}
        />
        <span className={styles.value}>{r.count}</span>
      </div>
      <ul className={styles.fixed}>
        <li>
          File: {N.fileMb} megabits ({N.fileMb / 8} megabytes)
        </li>
        <li>Server upload: {N.serverUpMbps} Mbps</li>
        <li>Each computer downloads at {N.clientDownMbps} Mbps</li>
        <li>In peer-to-peer, each peer also uploads at {N.peerUpMbps} Mbps</li>
      </ul>

      <svg className={styles.chart} viewBox="0 0 400 112" aria-hidden="true">
        <text className={styles.barLabel} x={BAR_X} y={16}>
          {`Client-server: ${formatSeconds(r.clientServer)} seconds`}
        </text>
        <rect
          className={styles.bar}
          x={BAR_X}
          y={22}
          width={barWidth(r.clientServer)}
          height={18}
          rx={4}
        />
        <text className={styles.barLabel} x={BAR_X} y={68}>
          {`Peer-to-peer: ${formatSeconds(r.peerToPeer)} seconds`}
        </text>
        <rect
          className={cx(styles.bar, styles.barPeer)}
          x={BAR_X}
          y={74}
          width={barWidth(r.peerToPeer)}
          height={18}
          rx={4}
        />
      </svg>

      <div role="status" className={styles.result}>
        <p>
          <span className={styles.badge}>Client-server:</span>{' '}
          {formatSeconds(r.clientServer)} seconds, set by{' '}
          {describeLimit(r.clientServerLimit)}.
        </p>
        <p>
          <span className={styles.badge}>Peer-to-peer:</span>{' '}
          {formatSeconds(r.peerToPeer)} seconds, set by{' '}
          {describeLimit(r.peerToPeerLimit)}.
        </p>
        <p>{compareText(r)}</p>
      </div>
    </div>
  );
}
