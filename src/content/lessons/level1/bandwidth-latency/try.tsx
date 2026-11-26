import { useId, useState } from 'react';
import {
  BANDWIDTH_STEPS,
  FILE_CHOICES,
  LATENCY_STEPS,
  advice,
  breakdown,
  dominantTitle,
  formatSeconds,
} from './logic';
import styles from './try.module.css';

function at(list: readonly number[], index: number): number {
  const i = Math.min(Math.max(Math.round(index), 0), list.length - 1);
  return list[i] ?? 1;
}

/**
 * Try it: "What are you waiting for?" Two sliders set the pipe and the road,
 * a choice sets the file; the pure `breakdown` gives both parts of the wait.
 * The sliders move over lists of values, so each step is a clear change.
 */
export function WhatAreYouWaitingFor() {
  const id = useId();
  const [bwIndex, setBwIndex] = useState(3); // 10 Mbps
  const [latIndex, setLatIndex] = useState(4); // 50 ms
  const [fileId, setFileId] = useState('photo');

  const bandwidthMbps = at(BANDWIDTH_STEPS, bwIndex);
  const latencyMs = at(LATENCY_STEPS, latIndex);
  const file = FILE_CHOICES.find((f) => f.id === fileId) ?? FILE_CHOICES[0];
  const b = breakdown({
    fileMb: file?.fileMb ?? 1,
    bandwidthMbps,
    latencyMs,
  });
  const delayPct = b.latencyShare * 100;

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>What are you waiting for?</h3>
      <p>
        Pick a file, then move the two sliders. Bandwidth is the width of the
        pipe. Latency is the length of the road. Watch the total, and which part
        of it is the bigger one.
      </p>

      <fieldset className={styles.files}>
        <legend>File to send</legend>
        {FILE_CHOICES.map((f) => (
          <label key={f.id} className={styles.choice}>
            <input
              type="radio"
              name={`${id}-file`}
              value={f.id}
              checked={f.id === fileId}
              onChange={() => {
                setFileId(f.id);
              }}
            />
            {f.label}
          </label>
        ))}
      </fieldset>

      <div className={styles.control}>
        <label htmlFor={`${id}-bw`}>Bandwidth (the width of the pipe)</label>
        <input
          id={`${id}-bw`}
          type="range"
          min={0}
          max={BANDWIDTH_STEPS.length - 1}
          step={1}
          value={bwIndex}
          aria-valuetext={`${String(bandwidthMbps)} megabits per second`}
          onChange={(e) => {
            setBwIndex(Number(e.target.value));
          }}
        />
        <span className={styles.value}>{bandwidthMbps} Mbps</span>
      </div>

      <div className={styles.control}>
        <label htmlFor={`${id}-lat`}>Latency (the length of the road)</label>
        <input
          id={`${id}-lat`}
          type="range"
          min={0}
          max={LATENCY_STEPS.length - 1}
          step={1}
          value={latIndex}
          aria-valuetext={`${String(latencyMs)} milliseconds`}
          onChange={(e) => {
            setLatIndex(Number(e.target.value));
          }}
        />
        <span className={styles.value}>{latencyMs} ms</span>
      </div>

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
      <p className={styles.key}>
        <span className={styles.keyDelay} aria-hidden="true" /> hatched: delay
        (latency) <span className={styles.keySend} aria-hidden="true" /> solid:
        sending (bandwidth)
      </p>

      <div role="status" className={styles.result}>
        <p>
          <span className={styles.badge}>{dominantTitle(b.dominant)}.</span>{' '}
          Total time: {formatSeconds(b.totalSeconds)} seconds.
        </p>
        <p>
          Delay (latency): {formatSeconds(b.latencySeconds)} seconds. Sending
          (bandwidth): {formatSeconds(b.transferSeconds)} seconds.
        </p>
        <p>{advice(b.dominant)}</p>
      </div>
    </div>
  );
}
