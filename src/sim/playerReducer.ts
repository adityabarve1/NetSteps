// The brain of the step player. Pure TypeScript: no React, no timers, no clock.
// SimPlayer owns the timer and sends a `tick` action each time one is due.
//
// Rules this file keeps (the tests pin each one):
// - `index` is always a whole number from 0 to the last step.
// - `playing` is only ever true while there is a next step to go to, so
//   autoplay stops by itself on the last step.
// - `finished` is sticky: once the learner has stood on the last step it stays
//   true (Reset and Play again do not clear it).
// - Manual moves (next, back, goTo) pause autoplay, so the learner's own
//   control always wins over the clock.
// - It never throws. Odd input is repaired: stepCount of 0 makes every action a
//   no-op, NaN and fractional indexes are rounded and clamped.

export type Speed = 0.5 | 1 | 2;

export const SPEEDS: readonly Speed[] = [0.5, 1, 2];

export type PlayerState = {
  index: number;
  playing: boolean;
  speed: Speed;
  finished: boolean;
};

export type PlayerAction =
  | { type: 'next' | 'back' | 'play' | 'pause' | 'tick' | 'reset' }
  | { type: 'goTo'; index: number }
  | { type: 'setSpeed'; speed: Speed };

export function isSpeed(value: unknown): value is Speed {
  return SPEEDS.some((speed) => speed === value);
}

// Anything that is not a positive, finite number counts as "no steps".
function countOf(stepCount: number): number {
  return Number.isFinite(stepCount) && stepCount >= 1
    ? Math.floor(stepCount)
    : 0;
}

function clampIndex(raw: number, last: number): number {
  if (Number.isNaN(raw)) return 0;
  return Math.min(Math.max(Math.floor(raw), 0), last);
}

/**
 * Repairs a state so it is valid for `stepCount` steps. SimPlayer runs this on
 * every render, so a lesson that swaps its step list (shorter, longer or
 * empty) never leaves the player pointing at a step that is gone. A valid state
 * comes back as the very same object.
 */
export function normalizePlayerState(
  state: PlayerState,
  stepCount: number,
): PlayerState {
  const n = countOf(stepCount);
  if (n === 0) {
    return state.index === 0 && !state.playing && !state.finished
      ? state
      : { ...state, index: 0, playing: false, finished: false };
  }
  const last = n - 1;
  const index = clampIndex(state.index, last);
  const finished = state.finished || index === last;
  const playing = state.playing && index < last;
  return index === state.index &&
    finished === state.finished &&
    playing === state.playing
    ? state
    : { ...state, index, playing, finished };
}

export function initialPlayerState(stepCount: number): PlayerState {
  return normalizePlayerState(
    { index: 0, playing: false, speed: 1, finished: false },
    stepCount,
  );
}

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
  stepCount: number,
): PlayerState {
  const n = countOf(stepCount);
  const s = normalizePlayerState(state, n);

  if (action.type === 'setSpeed') {
    return !isSpeed(action.speed) || action.speed === s.speed
      ? s
      : { ...s, speed: action.speed };
  }
  if (n === 0) return s;

  const last = n - 1;
  // The Math.min in 'next' and Math.max in 'back' are deliberate belt and
  // braces: normalizePlayerState also clamps, but each case stays correct alone.
  switch (action.type) {
    case 'next':
      return normalizePlayerState(
        { ...s, index: Math.min(s.index + 1, last), playing: false },
        n,
      );
    case 'back':
      return normalizePlayerState(
        { ...s, index: Math.max(s.index - 1, 0), playing: false },
        n,
      );
    case 'goTo':
      return normalizePlayerState(
        { ...s, index: clampIndex(action.index, last), playing: false },
        n,
      );
    case 'play':
      // One step: there is nothing to play through.
      if (last === 0) return s;
      return { ...s, index: s.index === last ? 0 : s.index, playing: true };
    case 'pause':
      return s.playing ? { ...s, playing: false } : s;
    case 'tick':
      // A tick that arrives after a pause or after the end is ignored.
      return s.playing
        ? normalizePlayerState({ ...s, index: s.index + 1 }, n)
        : s;
    case 'reset':
      return normalizePlayerState({ ...s, index: 0, playing: false }, n);
    default:
      return s;
  }
}
