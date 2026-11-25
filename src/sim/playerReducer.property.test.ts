import { describe, expect, it } from 'vitest';
import {
  initialPlayerState,
  playerReducer,
  SPEEDS,
  type PlayerAction,
} from '@/sim/playerReducer';

const ODD_INDEXES = [-5, -0.5, 0, 1, 2.7, 3, 99, Number.NaN, Infinity];

// A small seeded generator keeps this reproducible without a new dependency.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomAction(random: () => number): PlayerAction {
  const pick = Math.floor(random() * 10);
  switch (pick) {
    case 0:
      return { type: 'next' };
    case 1:
      return { type: 'back' };
    case 2:
      return { type: 'play' };
    case 3:
      return { type: 'pause' };
    case 4:
    case 5:
      return { type: 'tick' };
    case 6:
      return { type: 'reset' };
    case 7:
      return {
        type: 'goTo',
        index: ODD_INDEXES[Math.floor(random() * ODD_INDEXES.length)] ?? 0,
      };
    case 8:
      return {
        type: 'setSpeed',
        speed: SPEEDS[Math.floor(random() * 3)] ?? 1,
      };
    default:
      return { type: 'tick' };
  }
}

describe('property: random action sequences keep the state valid', () => {
  it('holds for many seeds, step counts and lengths', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const random = seededRandom(seed);
      const stepCount = Math.floor(random() * 7); // 0..6
      let s = initialPlayerState(stepCount);
      let wasFinished = s.finished;

      for (let i = 0; i < 60; i += 1) {
        s = playerReducer(s, randomAction(random), stepCount);

        const last = Math.max(0, stepCount - 1);
        expect(Number.isInteger(s.index)).toBe(true);
        expect(s.index).toBeGreaterThanOrEqual(0);
        expect(s.index).toBeLessThanOrEqual(last);
        if (stepCount === 0) {
          expect(s.playing).toBe(false);
          expect(s.finished).toBe(false);
        } else {
          // autoplay only runs while there is a next step to go to
          if (s.playing) expect(s.index).toBeLessThan(last);
          // finished is sticky
          if (wasFinished) expect(s.finished).toBe(true);
          // standing on the last step always counts as finished
          if (s.index === last) expect(s.finished).toBe(true);
        }
        wasFinished = s.finished;
      }
    }
  });
});
