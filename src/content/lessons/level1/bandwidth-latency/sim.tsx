import { cx } from '@/lib/cx';
import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { formatSeconds } from './logic';
import styles from './sim.module.css';
import { transferSteps, type TransferStep } from './steps';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const TRANSFER_SIM_ID = 'sim-l1-transfer';

// Worked out once: the numbers never change, so neither do the steps.
const STEPS: TransferStep[] = transferSteps();

const SENDER = { x: 4, w: 76 };
const RECEIVER_W = 76;
const PIPE_Y = 62;

// The pipe is thicker for more bandwidth (each extra digit adds a fixed
// amount, so 1 to 1000 Mbps fits the drawing) and the road is longer for more
// delay.
const pipeHeight = (mbps: number) => 8 + 9 * Math.log10(mbps);
const roadLength = (ms: number) => 60 + 1.4 * ms;

/** The two parts of the wait as one bar, plus the numbers in words. */
function WaitBar({ step }: { step: TransferStep }) {
  const { b } = step;
  const delayPct = b.latencyShare * 100;
  return (
    <div className={styles.wait}>
      <div className={styles.barRow} aria-hidden="true">
        {b.latencyShare > 0 ? (
          <span
            className={styles.delayPart}
            style={{ width: `${String(delayPct)}%` }}
          />
        ) : null}
        {b.latencyShare < 1 ? (
          <span
            className={styles.sendPart}
            style={{ width: `${String(100 - delayPct)}%` }}
          />
        ) : null}
      </div>
      <ul className={styles.numbers}>
        <li>
          <span className={styles.keyDelay} aria-hidden="true" /> Delay
          (latency): {formatSeconds(b.latencySeconds)} s
        </li>
        <li>
          <span className={styles.keySend} aria-hidden="true" /> Sending
          (bandwidth): {formatSeconds(b.transferSeconds)} s
        </li>
        <li className={styles.total}>
          Total: {formatSeconds(b.totalSeconds)} s
        </li>
      </ul>
    </div>
  );
}

/** One frame of the simulation. Exported so tests can check it directly. */
export function TransferDiagram({
  step,
  reducedMotion,
}: {
  step: TransferStep;
  reducedMotion: boolean;
}) {
  const h = pipeHeight(step.bandwidthMbps);
  const roadStart = SENDER.x + SENDER.w;
  const roadEnd = roadStart + roadLength(step.latencyMs);
  const midX = (roadStart + roadEnd) / 2;
  return (
    <>
      <svg
        className={styles.svg}
        viewBox="0 0 380 130"
        role="img"
        aria-label={step.label}
      >
        <rect
          className={styles.box}
          x={SENDER.x}
          y={26}
          width={SENDER.w}
          height={72}
          rx={8}
        />
        <text
          className={styles.boxText}
          x={SENDER.x + SENDER.w / 2}
          y={66}
          textAnchor="middle"
        >
          Sender
        </text>
        <rect
          className={styles.box}
          x={roadEnd}
          y={26}
          width={RECEIVER_W}
          height={72}
          rx={8}
        />
        <text
          className={styles.boxText}
          x={roadEnd + RECEIVER_W / 2}
          y={66}
          textAnchor="middle"
        >
          Receiver
        </text>

        <rect
          className={styles.pipe}
          x={roadStart}
          y={PIPE_Y - h / 2}
          width={roadEnd - roadStart}
          height={h}
        />
        <line
          className={cx(styles.dataLine, !reducedMotion && styles.flow)}
          x1={roadStart + 4}
          y1={PIPE_Y}
          x2={roadEnd - 4}
          y2={PIPE_Y}
        />
        <text className={styles.small} x={midX} y={14} textAnchor="middle">
          {`Pipe: ${String(step.bandwidthMbps)} Mbps`}
        </text>

        <line
          className={styles.road}
          x1={roadStart}
          y1={112}
          x2={roadEnd}
          y2={112}
        />
        <text className={styles.small} x={midX} y={127} textAnchor="middle">
          {`Road: ${String(step.latencyMs)} ms`}
        </text>
      </svg>
      <WaitBar step={step} />
      <p className={styles.legend}>
        The thicker the pipe, the more bandwidth. The longer the road, the more
        latency. The bar shows what share of the total time is delay and what
        share is sending.
      </p>
    </>
  );
}

/** A file crosses a link: widen the pipe, then shorten the road. */
export function TransferSim() {
  const { markSimFinished } = useLessonRun();
  return (
    <SimPlayer
      id={TRANSFER_SIM_ID}
      label="Simulation: a file crossing a link, widening the pipe and shortening the road"
      steps={STEPS}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <TransferDiagram step={s} reducedMotion={reducedMotion} />
      )}
      onFinished={markSimFinished}
      stepMs={5200}
    />
  );
}
