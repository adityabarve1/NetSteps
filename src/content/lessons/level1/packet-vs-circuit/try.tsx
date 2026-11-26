import { useId, useState } from 'react';
import { cx } from '@/lib/cx';
import styles from './try.module.css';
import {
  DEFAULT_HOPS,
  DEFAULT_KB,
  DEFAULT_SETUP,
  MAX_HOPS,
  MIN_HOPS,
  PACKET_BITS,
  RATE_BPS,
  clampHops,
  clampKb,
  clampSetup,
  formatSeconds,
  timingReport,
  verdictText,
  type Method,
} from './timing';

const SIZES_KB = [1, 2, 5, 8, 10, 20, 50] as const;
const SETUPS = [0, 0.2, 1, 3] as const;
const BAR_X = 8;
const BAR_W = 384;

const ROWS: { method: Method; label: string }[] = [
  { method: 'circuit', label: 'Circuit switching' },
  { method: 'packet', label: 'Packet switching' },
  { method: 'message', label: 'Message switching' },
];

/**
 * Try it: "How long does the message take?" Three controls set the message
 * size, the number of links in a row and the circuit's setup time; the pure
 * `timingReport` gives the three times.
 */
export function SwitchingTimes() {
  const id = useId();
  const [kb, setKb] = useState<number>(DEFAULT_KB);
  const [hops, setHops] = useState<number>(DEFAULT_HOPS);
  const [setup, setSetup] = useState<number>(DEFAULT_SETUP);
  const t = timingReport(kb, hops, setup);
  const longest = Math.max(t.circuit, t.packet, t.message);

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>How long does the message take?</h3>
      <p>
        Change the size of the message, how many links it crosses in a row and
        how long a circuit takes to set up. Watch which way finishes first.
      </p>
      <div className={styles.controls}>
        <div className={styles.control}>
          <label htmlFor={`${id}-size`}>Message size</label>
          <select
            id={`${id}-size`}
            value={t.sizeKB}
            onChange={(e) => {
              setKb(clampKb(Number(e.target.value)));
            }}
          >
            {SIZES_KB.map((n) => (
              <option key={n} value={n}>
                {`${String(n)} KB`}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.control}>
          <label htmlFor={`${id}-hops`}>Links in a row (hops)</label>
          <input
            id={`${id}-hops`}
            type="range"
            min={MIN_HOPS}
            max={MAX_HOPS}
            step={1}
            value={t.hops}
            onChange={(e) => {
              setHops(clampHops(Number(e.target.value)));
            }}
          />
          <span className={styles.value}>{t.hops}</span>
        </div>
        <div className={styles.control}>
          <label htmlFor={`${id}-setup`}>Circuit setup time</label>
          <select
            id={`${id}-setup`}
            value={t.setupSeconds}
            onChange={(e) => {
              setSetup(clampSetup(Number(e.target.value)));
            }}
          >
            {SETUPS.map((n) => (
              <option key={n} value={n}>
                {`${String(n)} seconds`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ul className={styles.fixed}>
        <li>Every link runs at {RATE_BPS / 1_000_000} megabit per second.</li>
        <li>
          Packets carry {PACKET_BITS / 8} bytes each, so {t.sizeKB} KB is{' '}
          {t.packets} packets.
        </li>
      </ul>

      <svg className={styles.chart} viewBox="0 0 400 190" aria-hidden="true">
        {ROWS.map(({ method, label }, i) => {
          const seconds = t[method];
          const y = 18 + i * 62;
          return (
            <g key={method}>
              <text className={styles.barLabel} x={BAR_X} y={y}>
                {`${label}: ${formatSeconds(seconds)} seconds`}
              </text>
              <rect
                className={cx(
                  styles.bar,
                  method === 'packet' && styles.barPacket,
                  method === 'message' && styles.barMessage,
                )}
                x={BAR_X}
                y={y + 10}
                width={Math.max(4, (seconds / longest) * BAR_W)}
                height={18}
                rx={4}
              />
            </g>
          );
        })}
      </svg>

      <div role="status" className={styles.result}>
        <p className={styles.verdict}>{verdictText(t)}</p>
        <p>
          Circuit: {formatSeconds(t.setupSeconds)} seconds setup, then the whole
          message at once. Packet: the first packet crosses {t.hops}{' '}
          {t.hops === 1 ? 'link' : 'links'}, and the other {t.packets - 1}{' '}
          follow it. Message: the whole message is stored and passed on at each
          of the {t.hops} {t.hops === 1 ? 'link' : 'links'}.
        </p>
      </div>
      <p className={styles.caveat}>
        This model leaves out packet headers, waiting in queues, lost packets
        and the time a signal takes to travel. Real packet networks pay for
        those; the lesson text explains how.
      </p>
    </div>
  );
}
