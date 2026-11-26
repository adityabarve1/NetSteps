import { cx } from '@/lib/cx';
import { SCOPES, describeStep, type Scope, type ScopeStep } from './logic';
import styles from './sim.module.css';

// Short limits for the drawing (the long forms are in scopeInfo).
const LIMITS: Record<Scope, string> = {
  PAN: '10 m or less',
  LAN: 'up to 2 km',
  MAN: 'up to 100 km',
  WAN: 'over 100 km',
};

function state(i: number, step: ScopeStep): string | undefined {
  if (i === step.rings - 1) return styles.now;
  return i < step.rings ? styles.reached : styles.future;
}

const CX = 128;
const CY = 130;
const RADII = [28, 58, 90, 122];

function Rings({ step }: { step: ScopeStep }) {
  return (
    <>
      {SCOPES.map((scope, i) => ({ scope, i }))
        .reverse()
        .map(({ scope, i }) => {
          const r = RADII[i] ?? 0;
          return (
            <g key={scope} className={cx(styles.ring, state(i, step))}>
              <circle cx={CX} cy={CY} r={r} />
              <text
                className={styles.ringName}
                x={CX}
                y={CY - r + 16}
                textAnchor="middle"
              >
                {scope}
              </text>
            </g>
          );
        })}
      <circle className={styles.you} cx={CX} cy={CY - 2} r={3.5} />
      <text className={styles.youText} x={CX} y={CY + 17} textAnchor="middle">
        You
      </text>
    </>
  );
}

function WideDiagram({ step }: { step: ScopeStep }) {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 440 260"
      role="img"
      aria-label={describeStep(step)}
    >
      <Rings step={step} />
      <text className={styles.small} x={278} y={26}>
        Now showing
      </text>
      <text className={styles.title} x={278} y={46}>
        {step.title}
      </text>
      {SCOPES.map((scope, i) => {
        const y = 82 + i * 42;
        return (
          <g key={scope} className={state(i, step)}>
            <text className={styles.marker} x={264} y={y}>
              {i === step.rings - 1 ? '▶' : ''}
            </text>
            <text className={styles.rowName} x={282} y={y}>
              {scope}
            </text>
            <text className={styles.small} x={282} y={y + 17}>
              {LIMITS[scope]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CompactDiagram({ step }: { step: ScopeStep }) {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 300 256"
      role="img"
      aria-label={describeStep(step)}
    >
      <text className={styles.title} x={2} y={18}>
        {`Now showing: ${step.title}`}
      </text>
      {SCOPES.map((scope, i) => {
        const y = 32 + i * 56;
        return (
          <g key={scope} className={cx(styles.band, state(i, step))}>
            <rect x={2} y={y} width={296} height={48} rx={8} />
            <text className={styles.rowName} x={14} y={y + 24}>
              {`${i === step.rings - 1 ? '▶ ' : ''}${scope}`}
            </text>
            <text className={styles.small} x={286} y={y + 24} textAnchor="end">
              {LIMITS[scope]}
            </text>
            <rect
              className={styles.bar}
              x={14}
              y={y + 33}
              width={(i + 1) * 64}
              height={6}
              rx={3}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** One frame of the simulation: nested rings, or stacked bands on a phone. */
export function ScopeDiagram({
  step,
  reducedMotion,
  compact,
}: {
  step: ScopeStep;
  reducedMotion: boolean;
  compact: boolean;
}) {
  return (
    <div className={cx(styles.frame, !reducedMotion && styles.animated)}>
      {compact ? <CompactDiagram step={step} /> : <WideDiagram step={step} />}
    </div>
  );
}
