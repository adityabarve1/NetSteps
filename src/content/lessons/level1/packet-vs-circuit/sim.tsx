import { cx } from '@/lib/cx';
import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { useCompactLayout } from '@/sim/useCompactLayout';
import styles from './sim.module.css';
import {
  switchingSteps,
  type PacketView,
  type RouteName,
  type SwitchStep,
} from './steps';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const SWITCHING_SIM_ID = 'sim-l1-switching';

// Worked out once: the numbers never change, so neither do the steps.
const STEPS: SwitchStep[] = switchingSteps();

type Point = { x: number; y: number };
type NodeId = 'S' | 'R1' | 'R2' | 'D';
type Box = Point & { w: number; h: number };

type Layout = {
  width: number;
  height: number;
  nodes: Record<NodeId, Box>;
  /** Top-left corner of tray place `slot` (3 to a row) at the sender or receiver. */
  tray: (end: 'S' | 'D', slot: number) => Point;
  mid: Point;
};

const SIZE = 18;
const STEP = 22;

// Wide: your device on the left, your friend on the right, a router above and
// a router below. The trays of waiting and arrived packets sit under the devices.
const WIDE: Layout = {
  width: 380,
  height: 220,
  nodes: {
    S: { x: 50, y: 108, w: 64, h: 40 },
    D: { x: 330, y: 108, w: 64, h: 40 },
    R1: { x: 190, y: 36, w: 72, h: 32 },
    R2: { x: 190, y: 180, w: 72, h: 32 },
  },
  tray: (end, slot) => ({
    x: (end === 'S' ? 18 : 298) + (slot % 3) * STEP,
    y: 152 + Math.floor(slot / 3) * STEP,
  }),
  mid: { x: 260, y: 72 },
};

// Compact (a phone): your device on top, your friend at the bottom, a router
// on each side, the trays beside the two devices.
const COMPACT: Layout = {
  width: 260,
  height: 270,
  nodes: {
    S: { x: 130, y: 36, w: 64, h: 40 },
    D: { x: 130, y: 224, w: 64, h: 40 },
    R1: { x: 50, y: 130, w: 72, h: 32 },
    R2: { x: 210, y: 130, w: 72, h: 32 },
  },
  tray: (end, slot) => ({
    x: 178 + (slot % 3) * STEP,
    y: (end === 'S' ? 14 : 202) + Math.floor(slot / 3) * STEP,
  }),
  mid: { x: 90, y: 177 },
};

const VIA: Record<RouteName, NodeId> = { A: 'R1', B: 'R2' };

const lerp = (p: Point, q: Point, t: number): Point => ({
  x: p.x + (q.x - p.x) * t,
  y: p.y + (q.y - p.y) * t,
});

function packetCentre(p: PacketView, L: Layout): Point {
  if (p.route === null) {
    const tray = L.tray(p.progress >= 1 ? 'D' : 'S', p.slot);
    return { x: tray.x + SIZE / 2, y: tray.y + SIZE / 2 };
  }
  const s = L.nodes.S;
  const r = L.nodes[VIA[p.route]];
  const d = L.nodes.D;
  return p.progress <= 0.5
    ? lerp(s, r, p.progress * 2)
    : lerp(r, d, (p.progress - 0.5) * 2);
}

const LINKS: { id: string; from: NodeId; to: NodeId; route: RouteName }[] = [
  { id: 'S-R1', from: 'S', to: 'R1', route: 'A' },
  { id: 'R1-D', from: 'R1', to: 'D', route: 'A' },
  { id: 'S-R2', from: 'S', to: 'R2', route: 'B' },
  { id: 'R2-D', from: 'R2', to: 'D', route: 'B' },
];

const NAMES: Record<NodeId, string> = {
  S: 'You',
  D: 'Friend',
  R1: 'Router 1',
  R2: 'Router 2',
};

function linkClass(
  link: (typeof LINKS)[number],
  step: SwitchStep,
  reducedMotion: boolean,
): string {
  const onCircuit = link.route === 'A';
  if (link.id === 'R1-D' && step.broken) return styles.broken ?? '';
  if (onCircuit && step.circuit === 'dropped') return styles.link ?? '';
  if (onCircuit && step.circuit === 'setup') return styles.reserved ?? '';
  if (onCircuit && step.circuit === 'active') {
    return cx(styles.reserved, !reducedMotion && styles.flow);
  }
  return styles.link ?? '';
}

/** One frame of the simulation. Exported so tests can check it directly. */
export function SwitchingDiagram({
  step,
  reducedMotion,
  compact = false,
}: {
  step: SwitchStep;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const L = compact ? COMPACT : WIDE;
  const note =
    step.circuit === 'setup' || step.circuit === 'active'
      ? 'Reserved for one call'
      : step.circuit === 'dropped'
        ? 'Call dropped'
        : null;
  const noteAt = compact
    ? { x: 4, y: 98, anchor: 'start' as const }
    : { x: 122, y: 50, anchor: 'end' as const };
  return (
    <>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${String(L.width)} ${String(L.height)}`}
        role="img"
        aria-label={step.label}
      >
        {LINKS.map((link) => {
          const a = L.nodes[link.from];
          const b = L.nodes[link.to];
          return (
            <line
              key={link.id}
              className={linkClass(link, step, reducedMotion)}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          );
        })}
        {step.broken ? (
          <g>
            <circle className={styles.xDisc} cx={L.mid.x} cy={L.mid.y} r={11} />
            <path
              className={styles.xMark}
              d={`M${String(L.mid.x - 5)} ${String(L.mid.y - 5)} L${String(L.mid.x + 5)} ${String(L.mid.y + 5)} M${String(L.mid.x + 5)} ${String(L.mid.y - 5)} L${String(L.mid.x - 5)} ${String(L.mid.y + 5)}`}
            />
            <text
              className={styles.small}
              x={L.mid.x + (compact ? -16 : 16)}
              y={L.mid.y + 4}
              textAnchor={compact ? 'end' : 'start'}
            >
              broken
            </text>
          </g>
        ) : null}
        {note === null ? null : (
          <text
            className={styles.note}
            x={noteAt.x}
            y={noteAt.y}
            textAnchor={noteAt.anchor}
          >
            {note}
          </text>
        )}

        {(Object.keys(L.nodes) as NodeId[]).map((id) => {
          const n = L.nodes[id];
          const router = id === 'R1' || id === 'R2';
          return (
            <g key={id}>
              <rect
                className={router ? styles.router : styles.device}
                x={n.x - n.w / 2}
                y={n.y - n.h / 2}
                width={n.w}
                height={n.h}
                rx={router ? 16 : 6}
              />
              <text
                className={styles.name}
                x={n.x}
                y={n.y + 5}
                textAnchor="middle"
              >
                {NAMES[id]}
              </text>
            </g>
          );
        })}

        {step.packets.map((p) => {
          const c = packetCentre(p, L);
          return (
            <g key={p.seq} data-seq={p.seq}>
              <rect
                className={cx(styles.packet, p.route === 'B' && styles.packetB)}
                x={c.x - SIZE / 2}
                y={c.y - SIZE / 2}
                width={SIZE}
                height={SIZE}
                rx={3}
              />
              <text
                className={styles.index}
                x={c.x}
                y={c.y + 4}
                textAnchor="middle"
              >
                {p.seq}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.legend}>
        Numbered squares are packets. Solid squares travel by route A (through
        Router 1), dashed squares by route B (through Router 2).
      </p>
    </>
  );
}

/** Packets take different routes and survive a broken link; a circuit call does not. */
export function SwitchingSim() {
  const { markSimFinished } = useLessonRun();
  const compact = useCompactLayout();
  return (
    <SimPlayer
      id={SWITCHING_SIM_ID}
      label="Simulation: packets and a circuit when a link breaks"
      steps={STEPS}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <SwitchingDiagram
          step={s}
          reducedMotion={reducedMotion}
          compact={compact}
        />
      )}
      onFinished={markSimFinished}
      stepMs={4800}
    />
  );
}
