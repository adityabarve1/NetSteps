import { cx } from '@/lib/cx';
import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { useCompactLayout } from '@/sim/useCompactLayout';
import { formatSeconds } from './logic';
import styles from './sim.module.css';
import { distributionSteps, type DistributionStep } from './steps';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const DISTRIBUTION_SIM_ID = 'sim-l1-distribution';

// Worked out once: the numbers never change, so neither do the steps.
const STEPS: DistributionStep[] = distributionSteps();

// The longest time in any step (80 s) fills the whole bar.
const MAX_SECONDS = Math.max(...STEPS.map((s) => s.seconds));

type Point = { x: number; y: number };

type Layout = {
  width: number;
  server: { x: number; y: number; w: number; h: number };
  /** Centre of client number i (0-based) of n. */
  client: (i: number, n: number) => Point;
  /** Where a line from the server meets a client. */
  serverLineEnd: (c: Point) => Point;
  serverLineStart: Point;
  barX: number;
  barW: number;
  barY: number;
};

const CLIENT_W = 36;
const CLIENT_H = 20;
const PER_ROW = 5;

// Wide: the server on the left, the clients in one column on the right, so
// every line from the server is a clear fan and none passes behind a client.
const WIDE: Layout = {
  width: 380,
  server: { x: 20, y: 102, w: 100, h: 56 },
  client: (i, n) => ({
    x: 280,
    y: 130 + (i - (n - 1) / 2) * (n > 5 ? 24 : 34),
  }),
  serverLineStart: { x: 120, y: 130 },
  serverLineEnd: (c) => ({ x: c.x - CLIENT_W / 2 - 3, y: c.y }),
  barX: 10,
  barW: 360,
  barY: 276,
};

// Compact (a phone): the server on top, the clients in rows of five below.
const COMPACT: Layout = {
  width: 260,
  server: { x: 70, y: 10, w: 120, h: 48 },
  client: (i) => ({
    x: 34 + (i % PER_ROW) * 48,
    y: 118 + Math.floor(i / PER_ROW) * 40,
  }),
  serverLineStart: { x: 130, y: 58 },
  serverLineEnd: (c) => ({ x: c.x, y: c.y - CLIENT_H / 2 - 3 }),
  barX: 10,
  barW: 240,
  barY: 200,
};

function countLabel(step: DistributionStep): string {
  const n = step.count;
  if (step.mode === 'compare') return `${String(n)} clients`;
  const word = step.mode === 'p2p' ? 'peer' : 'client';
  return `${String(n)} ${word}${n === 1 ? '' : 's'}`;
}

const line = (p: Point, q: Point) =>
  `M${String(p.x)} ${String(p.y)} L${String(q.x)} ${String(q.y)}`;

/** Paths for the dashed lines between peers: a chain in the wide layout, a grid in the compact one. */
function peerPaths(n: number, L: Layout, compact: boolean): string[] {
  const at = (i: number) => L.client(i, n);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = at(i);
    if (compact) {
      if (i % PER_ROW < PER_ROW - 1 && i + 1 < n) out.push(line(p, at(i + 1)));
      if (i + PER_ROW < n) out.push(line(p, at(i + PER_ROW)));
    } else if (i + 1 < n) {
      // A curve on the right-hand side from one peer to the next.
      const q = at(i + 1);
      const edge = p.x + CLIENT_W / 2;
      out.push(
        `M${String(edge)} ${String(p.y)} Q${String(edge + 18)} ${String((p.y + q.y) / 2)} ${String(edge)} ${String(q.y)}`,
      );
    }
  }
  return out;
}

function Bar({
  layout,
  row,
  seconds,
  label,
  peer,
}: {
  layout: Layout;
  row: number;
  seconds: number;
  label: string;
  peer: boolean;
}) {
  const y = layout.barY + row * 44;
  const width = Math.max(4, (seconds / MAX_SECONDS) * layout.barW);
  return (
    <g>
      <text className={styles.barText} x={layout.barX} y={y}>
        {`${label}: ${formatSeconds(seconds)} seconds`}
      </text>
      <rect
        className={cx(styles.bar, peer && styles.barPeer)}
        x={layout.barX}
        y={y + 8}
        width={width}
        height={18}
        rx={4}
      />
    </g>
  );
}

/** One frame of the simulation. Exported so tests can check it directly. */
export function DistributionDiagram({
  step,
  reducedMotion,
  compact = false,
}: {
  step: DistributionStep;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const L = compact ? COMPACT : WIDE;
  const peerMode = step.mode === 'p2p';
  // Room for one bar row, or two in the comparison step.
  const height = L.barY + 34 + (step.mode === 'compare' ? 44 : 0);
  const sends = peerMode
    ? 'sends pieces'
    : `sends ${String(step.count)} ${step.count === 1 ? 'copy' : 'copies'}`;
  const clients = Array.from({ length: step.count }, (_, i) =>
    L.client(i, step.count),
  );
  const labelAt = compact ? { x: 226, y: 38 } : { x: 346, y: 134 };

  return (
    <>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${String(L.width)} ${String(height)}`}
        role="img"
        aria-label={step.label}
      >
        <defs>
          <marker
            id="dist-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="11"
            markerHeight="11"
            orient="auto"
          >
            <path className={styles.arrowHead} d="M0 0 L10 5 L0 10 z" />
          </marker>
        </defs>

        {clients.map((c, i) => {
          const end = L.serverLineEnd(c);
          return (
            <line
              key={`s${String(i)}`}
              className={cx(
                peerMode ? styles.thinLine : styles.serverLine,
                !reducedMotion && !peerMode && styles.flow,
              )}
              x1={L.serverLineStart.x}
              y1={L.serverLineStart.y}
              x2={end.x}
              y2={end.y}
              markerEnd="url(#dist-arrow)"
            />
          );
        })}
        {peerMode
          ? peerPaths(step.count, L, compact).map((d) => (
              <path key={d} className={styles.peerLine} d={d} />
            ))
          : null}

        <rect
          className={styles.server}
          x={L.server.x}
          y={L.server.y}
          width={L.server.w}
          height={L.server.h}
          rx={10}
        />
        <text
          className={styles.serverText}
          x={L.server.x + L.server.w / 2}
          y={L.server.y + 24}
          textAnchor="middle"
        >
          Server
        </text>
        <text
          className={styles.small}
          x={L.server.x + L.server.w / 2}
          y={L.server.y + 44}
          textAnchor="middle"
        >
          {step.mode === 'compare' ? 'sends 10 copies' : sends}
        </text>

        {clients.map((c, i) => (
          <g key={`c${String(i)}`}>
            <rect
              className={cx(styles.client, peerMode && styles.peer)}
              x={c.x - CLIENT_W / 2}
              y={c.y - CLIENT_H / 2}
              width={CLIENT_W}
              height={CLIENT_H}
              rx={peerMode ? 10 : 5}
            />
            <text
              className={styles.index}
              x={c.x}
              y={c.y + 4}
              textAnchor="middle"
            >
              {i + 1}
            </text>
          </g>
        ))}
        <text
          className={styles.small}
          x={labelAt.x}
          y={labelAt.y}
          textAnchor="middle"
        >
          {countLabel(step)}
        </text>

        {step.mode === 'compare' ? (
          <>
            <Bar
              layout={L}
              row={0}
              seconds={step.seconds}
              label="Client-server"
              peer={false}
            />
            <Bar
              layout={L}
              row={1}
              seconds={step.otherSeconds ?? 0}
              label="Peer-to-peer"
              peer
            />
          </>
        ) : (
          <Bar
            layout={L}
            row={0}
            seconds={step.seconds}
            label={peerMode ? 'Peer-to-peer' : 'Client-server'}
            peer={peerMode}
          />
        )}
      </svg>
      <p className={styles.legend}>
        {step.mode === 'client-server'
          ? 'Solid arrows: a separate copy of the file goes from the server to each client. The bar is the time until every client has it.'
          : step.mode === 'p2p'
            ? 'Thin arrows: the server sends pieces. Dashed curves and lines: peers pass pieces to each other. The bar is the time until every peer has the file.'
            : 'Two bars for the same 10 computers: the shorter bar is the faster way in this model.'}
      </p>
    </>
  );
}

/** The same file sent client-server, then peer-to-peer, to 1, 5 and 10 computers. */
export function DistributionSim() {
  const { markSimFinished } = useLessonRun();
  const compact = useCompactLayout();
  return (
    <SimPlayer
      id={DISTRIBUTION_SIM_ID}
      label="Simulation: sending one file to many computers, client-server and peer-to-peer"
      steps={STEPS}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <DistributionDiagram
          step={s}
          reducedMotion={reducedMotion}
          compact={compact}
        />
      )}
      onFinished={markSimFinished}
      stepMs={4200}
    />
  );
}
