import { useLayoutEffect, useRef } from 'react';
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

  const backRef = useRef<HTMLButtonElement>(null);

  // A button that turns itself off while it has focus drops the focus to the
  // page. This runs after every render, so it also covers the arrow keys and
  // Home/End (handled by the group), not only clicks. Hand the focus to a
  // neighbour that stays on.
  useLayoutEffect(() => {
    const active = document.activeElement;
    const playable = count > 1;
    if (active === nextRef.current && nextRef.current?.disabled) {
      if (playable) playRef.current?.focus();
    } else if (active === backRef.current && backRef.current?.disabled) {
      if (!nextRef.current?.disabled) nextRef.current?.focus();
      else if (playable) playRef.current?.focus();
    }
  });

  const playable = count > 1;
  const playLabel = playing
    ? 'Pause'
    : index >= last && playable
      ? 'Play again'
      : 'Play';

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        <button
          ref={playRef}
          type="button"
          className={cx(styles.button, styles.primary)}
          onClick={onPlayPause}
          disabled={!playable}
        >
          {playLabel}
        </button>
        <button
          ref={backRef}
          type="button"
          className={styles.button}
          onClick={onBack}
          disabled={index <= 0}
        >
          Back
        </button>
        <button
          ref={nextRef}
          type="button"
          className={styles.button}
          onClick={onNext}
          disabled={index >= last}
        >
          Next
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onReset}
          disabled={!playable}
        >
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
