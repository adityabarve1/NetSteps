import { useSyncExternalStore } from 'react';
import styles from '@/pages/HeroAnimation.module.css';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

// matchMedia can be missing (old browsers, some test setups). Treat that as "no
// preference" instead of throwing.
function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

// A picture of a computer, a switch and a server joined by one cable, with a
// small packet of data travelling along it. It is decoration: the page says
// everything it needs to in words, so assistive technology skips it.
// With reduced motion the packet is parked on the first cable and nothing moves.
export function HeroAnimation() {
  const reduced = useSyncExternalStore(subscribe, prefersReducedMotion);
  const animated = !reduced;

  return (
    <svg
      className={styles.art}
      viewBox="0 0 480 220"
      aria-hidden="true"
      focusable="false"
      data-animated={String(animated)}
    >
      {/* The cable runs behind the switch, so it looks like one wire each side. */}
      <path className={styles.cable} d="M100 100H380" />

      {animated ? (
        <>
          <circle className={styles.packetOut} cx="100" cy="100" r="9" />
          <circle className={styles.packetBack} cx="380" cy="100" r="9" />
        </>
      ) : (
        <circle className={styles.packetOut} cx="146" cy="100" r="9" />
      )}

      {/* Computer */}
      <g className={styles.device}>
        <rect x="20" y="58" width="80" height="54" rx="8" />
        <path d="M60 112v16M42 130h36" />
      </g>
      <rect
        className={styles.screen}
        x="29"
        y="67"
        width="62"
        height="36"
        rx="4"
      />
      <text className={styles.label} x="60" y="190" textAnchor="middle">
        Computer
      </text>

      {/* Switch */}
      <g className={styles.device}>
        <rect x="190" y="76" width="100" height="48" rx="10" />
      </g>
      <g className={styles.ports}>
        <circle cx="210" cy="100" r="5" />
        <circle cx="230" cy="100" r="5" />
        <circle cx="250" cy="100" r="5" />
        <circle cx="270" cy="100" r="5" />
      </g>
      <text className={styles.label} x="240" y="190" textAnchor="middle">
        Switch
      </text>

      {/* Server */}
      <g className={styles.device}>
        <rect x="380" y="42" width="80" height="34" rx="7" />
        <rect x="380" y="82" width="80" height="34" rx="7" />
        <rect x="380" y="122" width="80" height="34" rx="7" />
      </g>
      <g className={styles.ports}>
        <circle cx="396" cy="59" r="4" />
        <circle cx="396" cy="99" r="4" />
        <circle cx="396" cy="139" r="4" />
      </g>
      <text className={styles.label} x="420" y="190" textAnchor="middle">
        Server
      </text>
    </svg>
  );
}
