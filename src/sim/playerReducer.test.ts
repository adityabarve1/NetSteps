import { describe, expect, it } from 'vitest';
import {
  initialPlayerState,
  normalizePlayerState,
  playerReducer,
  type PlayerAction,
  type PlayerState,
} from '@/sim/playerReducer';

const N = 4;

function run(
  actions: PlayerAction[],
  stepCount = N,
  from: PlayerState = initialPlayerState(stepCount),
): PlayerState {
  return actions.reduce((s, a) => playerReducer(s, a, stepCount), from);
}

const NEXT: PlayerAction = { type: 'next' };

describe('initialPlayerState', () => {
  it('starts paused at step 0, 1x, not finished', () => {
    expect(initialPlayerState(4)).toEqual({
      index: 0,
      playing: false,
      speed: 1,
      finished: false,
    });
  });

  it('a one-step simulation starts finished', () => {
    expect(initialPlayerState(1).finished).toBe(true);
    expect(initialPlayerState(1).playing).toBe(false);
  });

  it('never auto-plays, even with many steps', () => {
    expect(initialPlayerState(50).playing).toBe(false);
  });

  it('copes with zero, negative and NaN step counts', () => {
    for (const count of [0, -3, Number.NaN]) {
      expect(initialPlayerState(count)).toEqual({
        index: 0,
        playing: false,
        speed: 1,
        finished: false,
      });
    }
  });
});

describe('next and back', () => {
  it('next x3 reaches the last step and sets finished', () => {
    const s = run([NEXT, NEXT, NEXT]);
    expect(s.index).toBe(3);
    expect(s.finished).toBe(true);
  });

  it('is not finished one step before the end', () => {
    expect(run([NEXT, NEXT]).finished).toBe(false);
  });

  it('next at the end stays at the last step and is not playing', () => {
    const s = run([NEXT, NEXT, NEXT, NEXT, NEXT]);
    expect(s.index).toBe(3);
    expect(s.playing).toBe(false);
  });

  it('back never goes below 0', () => {
    expect(run([{ type: 'back' }, { type: 'back' }]).index).toBe(0);
    expect(run([NEXT, { type: 'back' }, { type: 'back' }]).index).toBe(0);
  });

  it('back keeps finished once it was reached', () => {
    const s = run([NEXT, NEXT, NEXT, { type: 'back' }]);
    expect(s.index).toBe(2);
    expect(s.finished).toBe(true);
  });
});

describe('play, pause and tick', () => {
  it('play starts autoplay from the middle', () => {
    const s = run([NEXT, { type: 'play' }]);
    expect(s).toMatchObject({ index: 1, playing: true });
  });

  it('play at the last step restarts at step 0 with playing true', () => {
    const s = run([NEXT, NEXT, NEXT, { type: 'play' }]);
    expect(s).toMatchObject({ index: 0, playing: true, finished: true });
  });

  it('pause stops autoplay', () => {
    expect(run([{ type: 'play' }, { type: 'pause' }]).playing).toBe(false);
  });

  it('tick while playing advances', () => {
    expect(run([{ type: 'play' }, { type: 'tick' }])).toMatchObject({
      index: 1,
      playing: true,
    });
  });

  it('tick onto the last step stops playing and finishes', () => {
    const s = run([
      { type: 'play' },
      { type: 'tick' },
      { type: 'tick' },
      { type: 'tick' },
    ]);
    expect(s).toMatchObject({ index: 3, playing: false, finished: true });
  });

  it('tick while not playing is a no-op', () => {
    const start = initialPlayerState(N);
    expect(playerReducer(start, { type: 'tick' }, N)).toBe(start);
    expect(run([NEXT, { type: 'tick' }]).index).toBe(1);
  });

  it('a late tick after the end cannot run past the last step', () => {
    const s = run([{ type: 'play' }, { type: 'tick' }, { type: 'tick' }]);
    const end = run([{ type: 'tick' }, { type: 'tick' }], N, {
      ...s,
      index: 3,
      playing: true,
    });
    expect(end.index).toBe(3);
    expect(end.playing).toBe(false);
  });
});

describe('manual control wins over autoplay', () => {
  const playing = run([NEXT, { type: 'play' }]);

  it('back pauses', () => {
    expect(playerReducer(playing, { type: 'back' }, N)).toMatchObject({
      index: 0,
      playing: false,
    });
  });

  it('next pauses', () => {
    expect(playerReducer(playing, NEXT, N)).toMatchObject({
      index: 2,
      playing: false,
    });
  });

  it('goTo pauses', () => {
    expect(playerReducer(playing, { type: 'goTo', index: 2 }, N)).toMatchObject(
      { index: 2, playing: false },
    );
  });
});

describe('goTo', () => {
  const go = (index: number, count = N) =>
    run([{ type: 'goTo', index }], count);

  it('clamps above the end to the last step', () => {
    expect(go(99).index).toBe(3);
    expect(go(Infinity).index).toBe(3);
  });

  it('clamps below 0 to 0', () => {
    expect(go(-1).index).toBe(0);
    expect(go(-Infinity).index).toBe(0);
  });

  it('turns NaN into 0', () => {
    expect(go(Number.NaN).index).toBe(0);
  });

  it('rounds a fraction down to a whole step', () => {
    expect(go(2.9).index).toBe(2);
    expect(go(-0.5).index).toBe(0);
    expect(Object.is(go(-0.5).index, 0)).toBe(true);
  });

  it('reaching the last step sets finished', () => {
    expect(go(3).finished).toBe(true);
    expect(go(2).finished).toBe(false);
  });
});

describe('reset', () => {
  it('goes back to step 0 and stops, keeping the speed', () => {
    const s = run([
      { type: 'setSpeed', speed: 2 },
      NEXT,
      { type: 'play' },
      { type: 'reset' },
    ]);
    expect(s).toMatchObject({ index: 0, playing: false, speed: 2 });
  });

  it('keeps finished: true (sticky)', () => {
    const s = run([NEXT, NEXT, NEXT, { type: 'reset' }]);
    expect(s).toMatchObject({ index: 0, playing: false, finished: true });
  });

  it('does not invent finished before the end', () => {
    expect(run([NEXT, { type: 'reset' }]).finished).toBe(false);
  });
});

describe('setSpeed', () => {
  it('changes only the speed', () => {
    const s = run([NEXT, { type: 'play' }, { type: 'setSpeed', speed: 0.5 }]);
    expect(s).toMatchObject({ index: 1, playing: true, speed: 0.5 });
  });

  it('ignores a speed that is not 0.5, 1 or 2', () => {
    const start = initialPlayerState(N);
    const bad = { type: 'setSpeed', speed: 3 } as unknown as PlayerAction;
    expect(playerReducer(start, bad, N)).toBe(start);
  });
});

describe('stepCount of 1', () => {
  it('every move is a no-op and play does not start', () => {
    const s = run(
      [NEXT, { type: 'back' }, { type: 'play' }, { type: 'tick' }],
      1,
    );
    expect(s).toEqual({ index: 0, playing: false, speed: 1, finished: true });
  });
});

describe('stepCount of 0', () => {
  const none = initialPlayerState(0);
  const actions: PlayerAction[] = [
    NEXT,
    { type: 'back' },
    { type: 'play' },
    { type: 'pause' },
    { type: 'tick' },
    { type: 'reset' },
    { type: 'goTo', index: 5 },
  ];

  it.each(actions)('$type is a no-op', (action) => {
    expect(playerReducer(none, action, 0)).toEqual(none);
  });

  it('setSpeed still works', () => {
    expect(playerReducer(none, { type: 'setSpeed', speed: 2 }, 0).speed).toBe(
      2,
    );
  });

  it('repairs a state left over from a longer list', () => {
    const stale: PlayerState = {
      index: 3,
      playing: true,
      speed: 1,
      finished: true,
    };
    expect(playerReducer(stale, NEXT, 0)).toEqual({
      index: 0,
      playing: false,
      speed: 1,
      finished: false,
    });
  });
});

describe('normalizePlayerState (when the step list changes length)', () => {
  const base: PlayerState = {
    index: 3,
    playing: true,
    speed: 1,
    finished: false,
  };

  it('clamps a stale index, stops autoplay at the new end and finishes', () => {
    expect(normalizePlayerState(base, 2)).toEqual({
      index: 1,
      playing: false,
      speed: 1,
      finished: true,
    });
  });

  it('keeps a valid state exactly as it is (same object)', () => {
    const ok: PlayerState = { ...base, index: 1 };
    expect(normalizePlayerState(ok, 6)).toBe(ok);
  });

  it('a longer list keeps finished and the index', () => {
    const done: PlayerState = { ...base, playing: false, finished: true };
    expect(normalizePlayerState(done, 10)).toEqual(done);
  });
});

describe('never throws and never mutates', () => {
  it('does not change the state it is given', () => {
    const s = Object.freeze({ ...initialPlayerState(N) });
    expect(() => playerReducer(s, NEXT, N)).not.toThrow();
    expect(s).toEqual(initialPlayerState(N));
  });

  it('survives an unknown action and odd step counts', () => {
    const s = initialPlayerState(N);
    const weird = { type: 'explode' } as unknown as PlayerAction;
    expect(playerReducer(s, weird, N)).toBe(s);
    for (const count of [Number.NaN, -1, 2.5, Infinity]) {
      expect(() => playerReducer(s, NEXT, count)).not.toThrow();
    }
  });
});
