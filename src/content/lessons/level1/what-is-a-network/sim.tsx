import { DeviceIcon } from '@/labs/DeviceIcon';
import { cx } from '@/lib/cx';
import type { Device, Network } from '@/netcore/network';
import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { journeySteps, type JourneyStep } from './logic';
import styles from './sim.module.css';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const JOURNEY_SIM_ID = 'sim-l1-journey';

// The fixed network of the simulation: PC1 - SW1 - PC2, all in 192.168.1.0/24.
// x and y are the centre of each device in the drawing below.
const SIM_NET: Network = {
  devices: [
    {
      id: 'pc1',
      kind: 'pc',
      name: 'PC1',
      ip: '192.168.1.10',
      mask: '255.255.255.0',
      x: 60,
      y: 96,
    },
    { id: 'sw1', kind: 'switch', name: 'SW1', x: 190, y: 96 },
    {
      id: 'pc2',
      kind: 'pc',
      name: 'PC2',
      ip: '192.168.1.20',
      mask: '255.255.255.0',
      x: 320,
      y: 96,
    },
  ],
  links: [
    { id: 'l1', a: 'pc1', b: 'sw1' },
    { id: 'l2', a: 'sw1', b: 'pc2' },
  ],
};

// Worked out once: the network never changes, so neither do the steps.
const STEPS: JourneyStep[] = journeySteps(SIM_NET, 'pc1', 'pc2');

const HALF = 40; // half the width of a device's outline box

function byId(id: string | undefined): Device | undefined {
  return SIM_NET.devices.find((d) => d.id === id);
}

function describe(step: JourneyStep): string {
  const holder = byId(step.at[step.at.length - 1]);
  const where =
    holder === undefined ? '' : ` The message is at ${holder.name}.`;
  const [a, b] = step.at.map((id) => byId(id)?.name ?? id);
  const moving =
    step.at.length === 2 && a !== undefined && b !== undefined
      ? ` The link from ${a} to ${b} is lit up.`
      : '';
  return `Diagram: PC1, switch SW1 and PC2 in a row, joined by two links.${where}${moving}`;
}

/** One frame of the simulation. The message sits on the last device in `at`. */
export function JourneyDiagram({
  step,
  reducedMotion,
}: {
  step: JourneyStep;
  reducedMotion: boolean;
}) {
  const holder = byId(step.at[step.at.length - 1]) ?? SIM_NET.devices[0];
  const lit = (id: string) => step.at.includes(id);
  const activeLink =
    step.at.length === 2
      ? SIM_NET.links.find(
          (l) =>
            (l.a === step.at[0] && l.b === step.at[1]) ||
            (l.b === step.at[0] && l.a === step.at[1]),
        )
      : undefined;
  const from = byId(step.at[0]);
  const to = byId(step.at[1]);
  const pointsRight = from !== undefined && to !== undefined && to.x > from.x;

  return (
    <>
      <svg
        className={styles.svg}
        viewBox="0 -12 380 178"
        role="img"
        aria-label={describe(step)}
      >
        {SIM_NET.links.map((l) => {
          const a = byId(l.a);
          const b = byId(l.b);
          if (a === undefined || b === undefined) return null;
          const active = l === activeLink;
          return (
            <line
              key={l.id}
              className={cx(styles.link, active && styles.linkActive)}
              x1={a.x + HALF}
              y1={a.y - 10}
              x2={b.x - HALF}
              y2={b.y - 10}
            />
          );
        })}
        {activeLink !== undefined && from !== undefined && to !== undefined ? (
          // An arrowhead at the receiving end shows the direction of travel.
          <path
            className={styles.arrow}
            d={
              pointsRight
                ? `M${String(to.x - HALF - 12)} ${String(to.y - 18)} l12 8 l-12 8 z`
                : `M${String(to.x + HALF + 12)} ${String(to.y - 18)} l-12 8 l12 8 z`
            }
          />
        ) : null}

        {SIM_NET.devices.map((d) => (
          <g
            key={d.id}
            transform={`translate(${String(d.x)} ${String(d.y)})`}
            className={cx(lit(d.id) && styles.deviceLit)}
          >
            <rect
              className={styles.box}
              x={-HALF}
              y={-42}
              width={HALF * 2}
              height={78}
              rx={10}
            />
            <DeviceIcon kind={d.kind} />
            <text className={styles.name} y={20} textAnchor="middle">
              {d.name}
            </text>
            <text className={styles.detail} y={56} textAnchor="middle">
              {d.ip ?? 'switch'}
            </text>
          </g>
        ))}

        {holder === undefined ? null : (
          <g
            className={cx(styles.message, !reducedMotion && styles.moving)}
            // Position only, not theming: the transform is what moves the marker.
            style={{ transform: `translate(${String(holder.x)}px, 0px)` }}
          >
            <rect
              className={styles.envelope}
              x={-15}
              y={20}
              width={30}
              height={20}
              rx={3}
            />
            <path className={styles.flap} d="M-15 21 L0 32 L15 21" />
            <text className={styles.tag} y={12} textAnchor="middle">
              Message
            </text>
          </g>
        )}
      </svg>
      {/* On a phone the drawing hides its small address lines; they are here instead. */}
      <p className={styles.phoneLegend}>
        <span>PC1: 192.168.1.10</span> <span>PC2: 192.168.1.20</span>
      </p>
    </>
  );
}

/** A message travels from PC1 through switch SW1 to PC2. */
export function JourneySim() {
  const { markSimFinished } = useLessonRun();
  return (
    <SimPlayer
      id={JOURNEY_SIM_ID}
      label="Simulation: a message travels from PC1 to PC2"
      steps={STEPS}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <JourneyDiagram step={s} reducedMotion={reducedMotion} />
      )}
      onFinished={markSimFinished}
      stepMs={2600}
    />
  );
}
