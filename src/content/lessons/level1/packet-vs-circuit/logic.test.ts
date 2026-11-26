import { describe, expect, it } from 'vitest';
import {
  assignRoutes,
  circuitSurvives,
  circuitSwitchingSeconds,
  messageSwitchingSeconds,
  packetSwitchingSeconds,
  splitIntoPackets,
} from './logic';

describe('splitIntoPackets', () => {
  it('splits 3500 bytes at 1000 into 1000, 1000, 1000, 500 numbered from 1', () => {
    expect(splitIntoPackets(3500, 1000)).toEqual([
      { seq: 1, bytes: 1000 },
      { seq: 2, bytes: 1000 },
      { seq: 3, bytes: 1000 },
      { seq: 4, bytes: 500 },
    ]);
  });

  it('gives full packets only when the size divides exactly', () => {
    expect(splitIntoPackets(2000, 1000).map((p) => p.bytes)).toEqual([
      1000, 1000,
    ]);
  });

  it('gives one short packet when the message is smaller than the payload', () => {
    expect(splitIntoPackets(10, 1000)).toEqual([{ seq: 1, bytes: 10 }]);
  });

  it('gives no packets for an empty message', () => {
    expect(splitIntoPackets(0, 1000)).toEqual([]);
  });

  it('always adds up to the message size', () => {
    for (const total of [1, 999, 1000, 1001, 4321]) {
      const sum = splitIntoPackets(total, 1000).reduce(
        (a, p) => a + p.bytes,
        0,
      );
      expect(sum).toBe(total);
    }
  });

  it('throws RangeError for a payload of zero or less', () => {
    expect(() => splitIntoPackets(100, 0)).toThrow(RangeError);
    expect(() => splitIntoPackets(100, -5)).toThrow(RangeError);
  });

  it('throws RangeError for hostile numbers', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => splitIntoPackets(bad, 1000)).toThrow(RangeError);
      expect(() => splitIntoPackets(100, bad)).toThrow(RangeError);
    }
    expect(() => splitIntoPackets(-1, 1000)).toThrow(RangeError);
    expect(() => splitIntoPackets(10.5, 1000)).toThrow(RangeError);
    expect(() => splitIntoPackets(100, 0.5)).toThrow(RangeError);
  });

  it('refuses a split into an absurd number of packets', () => {
    expect(() => splitIntoPackets(1e9, 1)).toThrow(RangeError);
  });
});

describe('circuitSwitchingSeconds', () => {
  const ok = { setupSeconds: 1, messageBits: 8000, rateBps: 1000 };

  it('is setup time plus the message time', () => {
    expect(circuitSwitchingSeconds(ok)).toBe(9);
  });

  it('allows zero setup and an empty message', () => {
    expect(
      circuitSwitchingSeconds({ setupSeconds: 0, messageBits: 0, rateBps: 5 }),
    ).toBe(0);
  });

  it('throws RangeError for a zero or negative rate and for bad numbers', () => {
    expect(() => circuitSwitchingSeconds({ ...ok, rateBps: 0 })).toThrow(
      RangeError,
    );
    expect(() => circuitSwitchingSeconds({ ...ok, rateBps: -1 })).toThrow(
      RangeError,
    );
    expect(() => circuitSwitchingSeconds({ ...ok, setupSeconds: -1 })).toThrow(
      RangeError,
    );
    expect(() => circuitSwitchingSeconds({ ...ok, messageBits: -1 })).toThrow(
      RangeError,
    );
    for (const bad of [NaN, Infinity]) {
      expect(() => circuitSwitchingSeconds({ ...ok, rateBps: bad })).toThrow(
        RangeError,
      );
      expect(() =>
        circuitSwitchingSeconds({ ...ok, messageBits: bad }),
      ).toThrow(RangeError);
      expect(() =>
        circuitSwitchingSeconds({ ...ok, setupSeconds: bad }),
      ).toThrow(RangeError);
    }
  });
});

describe('packetSwitchingSeconds', () => {
  const ok = { messageBits: 8000, packetBits: 1000, hops: 3, rateBps: 1000 };

  it('is (N + hops - 1) packet times: 10 seconds for the plan example', () => {
    expect(packetSwitchingSeconds(ok)).toBe(10);
  });

  it('with one hop it equals the plain transfer time', () => {
    expect(packetSwitchingSeconds({ ...ok, hops: 1 })).toBe(8);
  });

  it('is faster than message switching once there are several packets', () => {
    expect(packetSwitchingSeconds(ok)).toBeLessThan(
      messageSwitchingSeconds({ messageBits: 8000, hops: 3, rateBps: 1000 }),
    );
  });

  it('throws RangeError when the message is not a whole number of packets', () => {
    expect(() => packetSwitchingSeconds({ ...ok, messageBits: 8500 })).toThrow(
      RangeError,
    );
  });

  it('throws RangeError for zero hops, fractional hops and empty messages', () => {
    expect(() => packetSwitchingSeconds({ ...ok, hops: 0 })).toThrow(
      RangeError,
    );
    expect(() => packetSwitchingSeconds({ ...ok, hops: 1.5 })).toThrow(
      RangeError,
    );
    expect(() => packetSwitchingSeconds({ ...ok, messageBits: 0 })).toThrow(
      RangeError,
    );
  });

  it('throws RangeError for zero rate, zero packet size and hostile numbers', () => {
    expect(() => packetSwitchingSeconds({ ...ok, rateBps: 0 })).toThrow(
      RangeError,
    );
    expect(() => packetSwitchingSeconds({ ...ok, packetBits: 0 })).toThrow(
      RangeError,
    );
    expect(() => packetSwitchingSeconds({ ...ok, packetBits: -1000 })).toThrow(
      RangeError,
    );
    const keys = ['messageBits', 'packetBits', 'hops', 'rateBps'] as const;
    for (const bad of [NaN, Infinity, -Infinity]) {
      for (const key of keys) {
        expect(() => packetSwitchingSeconds({ ...ok, [key]: bad })).toThrow(
          RangeError,
        );
      }
    }
  });
});

describe('messageSwitchingSeconds', () => {
  const ok = { messageBits: 8000, hops: 3, rateBps: 1000 };

  it('is hops times the whole-message time: 24 seconds for the plan example', () => {
    expect(messageSwitchingSeconds(ok)).toBe(24);
  });

  it('does not need a whole number of packets', () => {
    expect(
      messageSwitchingSeconds({ messageBits: 8500, hops: 2, rateBps: 1000 }),
    ).toBe(17);
  });

  it('throws RangeError for bad inputs', () => {
    expect(() => messageSwitchingSeconds({ ...ok, hops: 0 })).toThrow(
      RangeError,
    );
    expect(() => messageSwitchingSeconds({ ...ok, rateBps: 0 })).toThrow(
      RangeError,
    );
    expect(() => messageSwitchingSeconds({ ...ok, messageBits: -1 })).toThrow(
      RangeError,
    );
    for (const bad of [NaN, Infinity]) {
      expect(() => messageSwitchingSeconds({ ...ok, hops: bad })).toThrow(
        RangeError,
      );
      expect(() => messageSwitchingSeconds({ ...ok, rateBps: bad })).toThrow(
        RangeError,
      );
    }
  });
});

describe('assignRoutes', () => {
  const A = ['S-R1', 'R1-D'];
  const B = ['S-R2', 'R2-D'];
  const C = ['S-R3', 'R3-D'];

  it('alternates A, B, A, B with two working routes', () => {
    expect(assignRoutes([A, B], 4, new Set())).toEqual([A, B, A, B]);
  });

  it('sends every packet by B when a link on A is broken', () => {
    expect(assignRoutes([A, B], 4, new Set(['R1-D']))).toEqual([B, B, B, B]);
  });

  it('gives null for every packet when both routes are broken', () => {
    expect(assignRoutes([A, B], 3, new Set(['R1-D', 'S-R2']))).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('treats a broken link written in the other direction as broken', () => {
    expect(assignRoutes([A, B], 2, new Set(['D-R1']))).toEqual([B, B]);
  });

  it('gives null when there are no routes at all', () => {
    expect(assignRoutes([], 2, new Set())).toEqual([null, null]);
  });

  it('gives an empty list for zero packets', () => {
    expect(assignRoutes([A, B], 0, new Set())).toEqual([]);
  });

  it('cycles over three routes in order', () => {
    expect(assignRoutes([A, B, C], 5, new Set())).toEqual([A, B, C, A, B]);
  });

  it('skips only the broken route when three are given', () => {
    expect(assignRoutes([A, B, C], 4, new Set(['S-R2']))).toEqual([A, C, A, C]);
  });

  it('throws RangeError for a negative, fractional or non-finite packet count', () => {
    for (const bad of [-1, 1.5, NaN, Infinity]) {
      expect(() => assignRoutes([A], bad, new Set())).toThrow(RangeError);
    }
  });

  it('does not change the routes it was given', () => {
    const routes = [A, B];
    assignRoutes(routes, 2, new Set(['R1-D']));
    expect(routes).toEqual([A, B]);
    expect(A).toEqual(['S-R1', 'R1-D']);
  });
});

describe('circuitSurvives', () => {
  const route = ['S-R1', 'R1-R2', 'R2-D'];

  it('is true when no link is broken', () => {
    expect(circuitSurvives(route, new Set())).toBe(true);
  });

  it('is false when any link on the route is broken, first, middle or last', () => {
    for (const link of route) {
      expect(circuitSurvives(route, new Set([link]))).toBe(false);
    }
  });

  it('is true when the broken link is elsewhere', () => {
    expect(circuitSurvives(route, new Set(['X-Y']))).toBe(true);
  });

  it('finds a broken link written in the other direction', () => {
    expect(circuitSurvives(route, new Set(['R2-R1']))).toBe(false);
  });

  it('treats an empty route as surviving (no link can break)', () => {
    expect(circuitSurvives([], new Set(['A-B']))).toBe(true);
  });
});
