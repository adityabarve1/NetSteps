import {
  useEffect,
  useReducer,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '@/lib/cx';
import { PlayerControls } from '@/sim/PlayerControls';
import {
  initialPlayerState,
  normalizePlayerState,
  playerReducer,
  type PlayerAction,
  type PlayerState,
} from '@/sim/playerReducer';
import styles from '@/sim/SimPlayer.module.css';
import { useReducedMotion } from '@/sim/useReducedMotion';

export type SimPlayerProps<S> = {
  /** Names this simulation. It is handed back to `onFinished`. */
  id: string;
  steps: S[];
  /** Plain-language words for a step. Shown, and announced to screen readers. */
  caption: (step: S) => string;
  render: (
    step: S,
    ctx: { index: number; reducedMotion: boolean },
  ) => ReactNode;
  /** Called once, the first time the learner reaches the last step. */
  onFinished?: (id: string) => void;
  /** Time spent on each step while playing at 1x. Default 1800 ms. */
  stepMs?: number;
  /** Name of the whole player for screen readers. */
  label?: string;
};

const DEFAULT_LABEL = 'Simulation controls and view';

function keyToAction(key: string, count: number): PlayerAction | undefined {
  switch (key) {
    case 'ArrowRight':
      return { type: 'next' };
    case 'ArrowLeft':
      return { type: 'back' };
    case 'Home':
      return { type: 'goTo', index: 0 };
    case 'End':
      return { type: 'goTo', index: count - 1 };
    default:
      return undefined;
  }
}

/**
 * The one step player every lesson uses.
 *
 * Changing `id` starts a fresh player (the inner component is keyed by it).
 * Changing `steps` (new identity, longer, shorter or empty) keeps the learner's
 * place and repairs it during render: see normalizePlayerState. Nothing resets
 * just because a lesson rebuilt the same list.
 */
export function SimPlayer<S>(props: SimPlayerProps<S>) {
  return <Player key={props.id} {...props} />;
}

function Player<S>({
  id,
  steps,
  caption,
  render,
  onFinished,
  stepMs = 1800,
  label = DEFAULT_LABEL,
}: SimPlayerProps<S>) {
  const count = steps.length;
  const reducedMotion = useReducedMotion();
  const [stored, dispatch] = useReducer(
    (s: PlayerState, a: PlayerAction) => playerReducer(s, a, count),
    count,
    initialPlayerState,
  );
  // Derived, not stored: always valid for the steps we have right now.
  const state = normalizePlayerState(stored, count);
  const { index, playing, speed, finished } = state;

  // Autoplay: one timer per step. A new timer is made whenever the step, the
  // speed or playing changes, and the old one is always cleared first, so none
  // survives a pause, a speed change or an unmount.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'tick' });
    }, stepMs / speed);
    return () => {
      clearTimeout(timer);
    };
  }, [playing, index, speed, stepMs]);

  // Do not keep running in a background tab. It does not resume by itself.
  useEffect(() => {
    function pauseWhenHidden() {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause' });
    }
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, []);

  // Tell the lesson once per mount. The ref remembers that we already did, and
  // a ref also survives StrictMode's extra mount-unmount-mount of effects, so
  // the callback cannot fire twice. `onFinished` is a dependency only so we
  // always call the newest one; a new function alone cannot cause a second call.
  const told = useRef(false);
  useEffect(() => {
    if (!finished || told.current) return;
    told.current = true;
    onFinished?.(id);
  }, [finished, id, onFinished]);

  const step = steps[index];
  if (step === undefined) {
    return (
      <div className={styles.player}>
        <p className={styles.empty}>
          Nothing to show here yet. Check back soon.
        </p>
      </div>
    );
  }

  const text = caption(step);

  // Arrow keys step, Home and End jump. A slider and a menu already use these
  // keys themselves, and browser shortcuts (Alt+Left) must keep working.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (
      event.target instanceof Element &&
      event.target.closest('input, select')
    ) {
      return;
    }
    const action = keyToAction(event.key, count);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  }

  return (
    // The group must take focus so the arrow keys work without hunting for a
    // button first, and a group is not an interactive role by itself.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the labelled group handles the shortcut keys for the whole player
    <div
      className={styles.player}
      role="group"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a focusable group is how the arrow keys work without hunting for a button first
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={styles.stage}>
        {render(step, { index, reducedMotion })}
      </div>

      <div className={styles.progress} aria-hidden="true">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cx(styles.segment, i <= index && styles.done)}
          />
        ))}
      </div>

      <p
        className={styles.counter}
      >{`Step ${String(index + 1)} of ${String(count)}`}</p>
      <p role="status" className={styles.caption}>
        {text}
      </p>

      <PlayerControls
        index={index}
        count={count}
        playing={playing}
        speed={speed}
        valueText={`Step ${String(index + 1)} of ${String(count)}: ${text}`}
        onPlayPause={() => {
          dispatch({ type: playing ? 'pause' : 'play' });
        }}
        onBack={() => {
          dispatch({ type: 'back' });
        }}
        onNext={() => {
          dispatch({ type: 'next' });
        }}
        onReset={() => {
          dispatch({ type: 'reset' });
        }}
        onGoTo={(to) => {
          dispatch({ type: 'goTo', index: to });
        }}
        onSpeed={(to) => {
          dispatch({ type: 'setSpeed', speed: to });
        }}
      />
    </div>
  );
}
