import { useRef } from 'react';
import { cx } from '@/lib/cx';
import { SPEEDS, type Speed } from '@/sim/playerReducer';
import styles from '@/sim/SimPlayer.module.css';

type Props = {
  index: number;
  count: number;
  playing: boolean;
  speed: Speed;
  valueText: string;
  onPlayPause: () => void;
  onBack: () => void;
  onNext: () => void;
  onReset: () => void;
  onGoTo: (index: number) => void;
  onSpeed: (speed: Speed) => void;
};

// The button row, the scrubber and the speed menu. All of them are real HTML
// controls, so keyboard, touch and screen readers work without extra code.
export function PlayerControls({
  index,
  count,
  playing,
  speed,
  valueText,
  onPlayPause,
  onBack,
  onNext,
  onReset,
  onGoTo,
  onSpeed,
}: Props) {
  const last = count - 1;
  const playRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // A button that turns itself off while it has focus drops the focus to the
  // page. Hand it to a neighbour that stays on instead.
  function next() {
    onNext();
    if (index + 1 >= last) playRef.current?.focus();
  }
  function back() {
    onBack();
    if (index - 1 <= 0) nextRef.current?.focus();
  }

  const playLabel = playing ? 'Pause' : index >= last ? 'Play again' : 'Play';

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        <button
          ref={playRef}
          type="button"
          className={cx(styles.button, styles.primary)}
          onClick={onPlayPause}
        >
          {playLabel}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={back}
          disabled={index <= 0}
        >
          Back
        </button>
        <button
          ref={nextRef}
          type="button"
          className={styles.button}
          onClick={next}
          disabled={index >= last}
        >
          Next
        </button>
        <button type="button" className={styles.button} onClick={onReset}>
          Reset
        </button>
      </div>

      <input
        type="range"
        className={styles.scrubber}
        aria-label="Step"
        aria-valuetext={valueText}
        min={0}
        max={last}
        step={1}
        value={index}
        disabled={last === 0}
        onChange={(event) => {
          onGoTo(Number(event.target.value));
        }}
      />

      <label className={styles.speed}>
        <span>Speed</span>
        <select
          className={styles.select}
          value={String(speed)}
          onChange={(event) => {
            const chosen = SPEEDS.find(
              (option) => String(option) === event.target.value,
            );
            if (chosen !== undefined) onSpeed(chosen);
          }}
        >
          {SPEEDS.map((option) => (
            <option key={option} value={String(option)}>
              {`${String(option)}x`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
