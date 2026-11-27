import { useState } from 'react';
import { cx } from '@/lib/cx';
import { TRY_DEVICES, networkVerdict } from './logic';
import styles from './try.module.css';

// Where each device sits around the switch in the little picture.
const SPOTS: Record<string, { x: number; y: number }> = {
  laptop: { x: 55, y: 40 },
  desktop: { x: 265, y: 40 },
  printer: { x: 55, y: 150 },
  tv: { x: 265, y: 150 },
};
const HUB = { x: 160, y: 95 };

/**
 * Try it: "Is it a network?" The learner plugs devices into a switch and turns
 * the switch's power on and off; networkVerdict (pure, tested) says in words
 * whether the result is a network and what the devices could share.
 */
export function IsItANetwork() {
  const [connected, setConnected] = useState<string[]>([]);
  const [switchOn, setSwitchOn] = useState(true);
  const verdict = networkVerdict({ connected, switchOn });

  function toggle(id: string) {
    setConnected((now) =>
      now.includes(id) ? now.filter((x) => x !== id) : [...now, id],
    );
  }

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>Is it a network?</h3>
      <p>
        Tick the devices you want to plug into the switch. Try one device, then
        two, then all four. Then switch the power off and on. The verdict below
        changes as you go.
      </p>
      <div className={styles.layout}>
        <fieldset className={styles.controls}>
          <legend className={styles.legend}>Plug into the switch</legend>
          {TRY_DEVICES.map((d) => (
            <label key={d.id} className={styles.option}>
              <input
                type="checkbox"
                checked={connected.includes(d.id)}
                onChange={() => {
                  toggle(d.id);
                }}
              />
              {d.name}
            </label>
          ))}
          <label className={cx(styles.option, styles.power)}>
            <input
              type="checkbox"
              checked={switchOn}
              onChange={() => {
                setSwitchOn((on) => !on);
              }}
            />
            The switch has power
          </label>
        </fieldset>

        <svg
          className={styles.picture}
          viewBox="0 0 320 190"
          aria-hidden="true"
        >
          {TRY_DEVICES.map((d) => {
            const spot = SPOTS[d.id];
            if (spot === undefined || !connected.includes(d.id)) return null;
            return (
              <line
                key={d.id}
                className={styles.cable}
                x1={spot.x}
                y1={spot.y}
                x2={HUB.x}
                y2={HUB.y}
              />
            );
          })}
          <rect
            className={cx(styles.hub, !switchOn && styles.hubOff)}
            x={HUB.x - 42}
            y={HUB.y - 20}
            width={84}
            height={40}
            rx={8}
          />
          <text
            className={styles.label}
            x={HUB.x}
            y={HUB.y + 6}
            textAnchor="middle"
          >
            {switchOn ? 'Switch' : 'Switch (off)'}
          </text>
          {TRY_DEVICES.map((d) => {
            const spot = SPOTS[d.id];
            if (spot === undefined) return null;
            const on = connected.includes(d.id);
            return (
              <g key={d.id}>
                <rect
                  className={cx(styles.device, on && styles.deviceOn)}
                  x={spot.x - 45}
                  y={spot.y - 18}
                  width={90}
                  height={36}
                  rx={8}
                />
                <text
                  className={styles.label}
                  x={spot.x}
                  y={spot.y + 6}
                  textAnchor="middle"
                >
                  {d.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        role="status"
        className={cx(styles.verdict, verdict.isNetwork && styles.verdictYes)}
      >
        <p className={styles.summary}>
          <span className={styles.badge}>
            {verdict.isNetwork ? '✓ Network' : '✗ Not a network'}
          </span>{' '}
          {verdict.summary}
        </p>
        {verdict.details.length > 0 ? (
          <ul className={styles.details}>
            {verdict.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
