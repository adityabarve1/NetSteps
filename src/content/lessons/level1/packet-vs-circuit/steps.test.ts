// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { circuitSurvives, assignRoutes } from './logic';
import {
  BROKEN_LINK,
  MESSAGE_BYTES,
  ROUTE_A,
  ROUTE_B,
  switchingSteps,
  type SwitchStep,
} from './steps';

const steps = switchingSteps();
const at = (i: number): SwitchStep => {
  const s = steps[i];
  if (s === undefined) throw new Error(`no step ${String(i)}`);
  return s;
};
const routesOf = (s: SwitchStep) => s.packets.map((p) => p.route);

describe('switchingSteps', () => {
  it('has ten steps with a caption and a picture label each', () => {
    expect(steps).toHaveLength(10);
    for (const s of steps) {
      expect(s.caption.length).toBeGreaterThan(40);
      expect(s.label.startsWith('Diagram:')).toBe(true);
    }
  });

  it('splits the 5500-byte message into six numbered packets waiting at the source', () => {
    expect(MESSAGE_BYTES).toBe(5500);
    const s = at(0);
    expect(s.packets.map((p) => p.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(routesOf(s)).toEqual([null, null, null, null, null, null]);
    expect(s.packets.every((p) => p.progress === 0)).toBe(true);
    expect(s.caption).toContain('five of 1000 bytes');
    expect(s.caption).toContain('500');
  });

  it('sends the first three packets A, B, A as assignRoutes says', () => {
    const s = at(1);
    const expected = assignRoutes([ROUTE_A, ROUTE_B], 3, new Set());
    expect(expected).toEqual([ROUTE_A, ROUTE_B, ROUTE_A]);
    expect(routesOf(s)).toEqual(['A', 'B', 'A', null, null, null]);
    expect(s.broken).toBe(false);
  });

  it('shares both routes with six packets, alternating, never two on one spot', () => {
    const s = at(2);
    expect(routesOf(s)).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
    const spots = s.packets.map(
      (p) => `${String(p.route)}@${String(p.progress)}`,
    );
    expect(new Set(spots).size).toBe(6);
    for (const p of s.packets) {
      expect(p.progress).toBeGreaterThan(0);
      expect(p.progress).toBeLessThan(1);
    }
  });

  it('shows the packets arriving out of order, then put back in order', () => {
    const arrived = at(3);
    expect(arrived.packets.every((p) => p.progress === 1)).toBe(true);
    const byTray = [...arrived.packets]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.seq);
    expect(byTray).toEqual([2, 1, 4, 3, 6, 5]);
    const ordered = [...at(4).packets]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.seq);
    expect(ordered).toEqual([1, 2, 3, 4, 5, 6]);
    expect(at(4).caption).toContain('in order');
  });

  it('runs a circuit call: set up, active, then dropped by the break', () => {
    expect(steps.map((s) => s.circuit)).toEqual([
      'none',
      'none',
      'none',
      'none',
      'none',
      'setup',
      'active',
      'dropped',
      'none',
      'none',
    ]);
    for (const i of [5, 6, 7]) expect(at(i).packets).toEqual([]);
    expect(at(6).broken).toBe(false);
    expect(at(7).broken).toBe(true);
    expect(circuitSurvives(ROUTE_A, new Set([BROKEN_LINK]))).toBe(false);
    expect(at(7).caption).toContain('call drops');
  });

  it('after the break the remaining packets all take route B', () => {
    const s = at(8);
    expect(s.broken).toBe(true);
    expect(s.packets.map((p) => p.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(routesOf(s)).toEqual([null, null, null, 'B', 'B', 'B']);
    // Packets 1 to 3 had already arrived before the break.
    expect(s.packets.slice(0, 3).every((p) => p.progress === 1)).toBe(true);
    expect(s.packets.slice(3).every((p) => p.progress < 1)).toBe(true);
  });

  it('ends with the whole message delivered and the break still shown', () => {
    const s = at(9);
    expect(s.packets.every((p) => p.progress === 1)).toBe(true);
    expect(s.broken).toBe(true);
    expect(s.caption).toContain('All six packets arrive');
  });
});
