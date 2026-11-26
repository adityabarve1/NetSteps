// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  SCOPES,
  scopeForDistance,
  scopeInfo,
  scopeSteps,
  type Scope,
} from './logic';

describe('scopeSteps', () => {
  it('goes earbuds, home, campus, city, countries', () => {
    expect(scopeSteps.map((s) => s.title)).toEqual([
      'Earbuds and phone',
      'A home',
      'A school campus',
      'A city',
      'Different countries',
    ]);
    expect(scopeSteps.map((s) => s.scope)).toEqual([
      'PAN',
      'LAN',
      'LAN',
      'MAN',
      'WAN',
    ]);
  });

  it('gives every step a distance that classifies as its own scope', () => {
    for (const s of scopeSteps) {
      expect(scopeForDistance(s.km), s.title).toBe(s.scope);
    }
  });

  it('never shrinks: distances grow from step to step', () => {
    scopeSteps.slice(1).forEach((s, i) => {
      expect(s.km).toBeGreaterThan(scopeSteps[i]?.km ?? Infinity);
    });
  });

  it('counts the rings reached as the position of the scope (1 to 4)', () => {
    for (const s of scopeSteps) {
      expect(s.rings).toBe(SCOPES.indexOf(s.scope) + 1);
    }
  });

  it('writes a caption that starts with the scope and names its example', () => {
    for (const s of scopeSteps) {
      expect(s.caption.startsWith(`${s.scope}:`), s.title).toBe(true);
      expect(s.caption.length).toBeGreaterThan(80);
    }
    expect(scopeSteps[0]?.caption).toContain('earbuds');
    expect(scopeSteps[4]?.caption).toContain('rent');
  });
});

describe('scopeInfo', () => {
  it('has a name, a reach and an example for every scope', () => {
    for (const scope of SCOPES) {
      const info = scopeInfo[scope];
      expect(info.name.toLowerCase()).toContain('area network');
      expect(info.reach.length).toBeGreaterThan(5);
      expect(info.example.length).toBeGreaterThan(10);
    }
  });

  it('states the same limits as scopeForDistance', () => {
    const expected: Record<Scope, string> = {
      PAN: '10 m',
      LAN: '2 km',
      MAN: '100 km',
      WAN: '100 km',
    };
    for (const scope of SCOPES) {
      expect(scopeInfo[scope].reach).toContain(expected[scope]);
    }
  });
});
