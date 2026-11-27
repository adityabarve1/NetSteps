import styles from '@/pages/ProgressRing.module.css';

const RADIUS = 20;
const LENGTH = 2 * Math.PI * RADIUS;

// A count that is safe to draw: a whole number, never negative, never NaN.
function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

type Props = {
  done: number;
  total: number;
  /** Names the ring for a screen reader, ahead of the count. */
  label?: string;
};

// A ring that fills as lessons are done, with the count in the middle, so the
// number says the same thing as the colour. With a total of 0 it is just empty.
export function ProgressRing({ done, total, label }: Props) {
  const all = whole(total);
  const finished = Math.min(whole(done), all);
  const share = all === 0 ? 0 : finished / all;
  const count = `${String(finished)} of ${String(all)} ${all === 1 ? 'lesson' : 'lessons'} done`;
  const name = label === undefined ? count : `${label}: ${count}`;

  return (
    <svg
      className={styles.ring}
      viewBox="0 0 48 48"
      role="img"
      aria-label={name}
    >
      <circle className={styles.track} cx="24" cy="24" r={RADIUS} />
      {share > 0 && (
        <circle
          className={styles.fill}
          cx="24"
          cy="24"
          r={RADIUS}
          transform="rotate(-90 24 24)"
          strokeDasharray={`${String(share * LENGTH)} ${String(LENGTH)}`}
          data-ring-fill=""
          data-ring-length={LENGTH}
        />
      )}
      <text className={styles.text} x="24" y="24" aria-hidden="true">
        {`${String(finished)}/${String(all)}`}
      </text>
    </svg>
  );
}
