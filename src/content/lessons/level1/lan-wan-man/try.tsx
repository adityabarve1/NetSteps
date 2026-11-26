import { useId, useState } from 'react';
import { cx } from '@/lib/cx';
import {
  SCOPES,
  SLIDER_MAX,
  formatDistance,
  kmFromSlider,
  scopeForDistance,
  scopeInfo,
} from './logic';
import styles from './try.module.css';

const START_POSITION = 47; // 50 metres: a LAN

/**
 * Try it: "How far does it reach?" A logarithmic slider sets a distance from 1
 * metre to 20 000 km; scopeForDistance (pure, tested) names the network, and
 * the verdict starts with that name as a word, not only a colour.
 */
export function HowFarDoesItReach() {
  const [position, setPosition] = useState(START_POSITION);
  const sliderId = useId();
  const km = kmFromSlider(position);
  const distance = formatDistance(km);
  const scope = scopeForDistance(km);
  const info = scopeInfo[scope];

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>How far does it reach?</h3>
      <p>
        Move the slider to set the distance between the two devices that are
        farthest apart. The name of the network changes as you go. You can also
        use the arrow keys, Page Up and Page Down, Home and End.
      </p>

      <label className={styles.label} htmlFor={sliderId}>
        Distance between the farthest devices
      </label>
      <input
        id={sliderId}
        className={styles.slider}
        type="range"
        min={0}
        max={SLIDER_MAX}
        step={1}
        value={position}
        aria-valuetext={`${distance}: ${scope}`}
        onChange={(e) => {
          setPosition(Number(e.target.value));
        }}
      />
      <div className={styles.ends} aria-hidden="true">
        <span>1 m</span>
        <span>20,000 km</span>
      </div>
      <p className={styles.readout}>
        Distance: <strong>{distance}</strong>
      </p>
      <div role="status" className={cx(styles.verdict, styles[scope])}>
        <p className={styles.summary}>
          <span className={styles.badge}>{scope}</span> {info.name}.{' '}
          {`At ${distance} this is a ${scope}.`}
        </p>
        <p className={styles.example}>{`Example: ${info.example}`}</p>
      </div>

      <p className={styles.note}>
        The slider is not a straight scale. Each step multiplies the distance,
        so one slider can show both metres and thousands of kilometres.
      </p>

      <ul className={styles.ranges}>
        {SCOPES.map((s) => (
          <li key={s} className={cx(s === scope && styles.current)}>
            <strong>{s}</strong>: {scopeInfo[s].reach}
            {s === scope ? ' (you are here)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
