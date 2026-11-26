// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildProblems, checkAnswer, createRng } from '@/labs/practice';
import {
  SCOPES,
  SLIDER_MAX,
  formatDistance,
  generateScopeProblem,
  kmFromSlider,
  scopeForDistance,
  scopeQuestions,
  type Scope,
} from './logic';

describe('scopeForDistance', () => {
  it.each<[number, Scope]>([
    [0.005, 'PAN'],
    [0.5, 'LAN'],
    [30, 'MAN'],
    [5000, 'WAN'],
    [2, 'LAN'],
    [100, 'MAN'],
  ])('%s km is %s', (km, scope) => {
    expect(scopeForDistance(km)).toBe(scope);
  });

  it('puts each boundary in the smaller group and the next value above in the larger', () => {
    expect(scopeForDistance(0.01)).toBe('PAN');
    expect(scopeForDistance(0.0100001)).toBe('LAN');
    expect(scopeForDistance(2.0000001)).toBe('MAN');
    expect(scopeForDistance(100.0000001)).toBe('WAN');
  });

  it('accepts zero and very large distances', () => {
    expect(scopeForDistance(0)).toBe('PAN');
    expect(scopeForDistance(Number.MAX_VALUE)).toBe('WAN');
  });

  it.each([Number.NaN, -1, -0.0001, Infinity, -Infinity])(
    'throws a RangeError for %s',
    (km) => {
      expect(() => scopeForDistance(km)).toThrow(RangeError);
    },
  );

  it('throws for input that is not a number', () => {
    expect(() => scopeForDistance('5' as unknown as number)).toThrow(
      RangeError,
    );
  });
});

describe('scopeQuestions', () => {
  it('has at least 8 scenarios, at least 2 for every scope', () => {
    expect(scopeQuestions.length).toBeGreaterThanOrEqual(8);
    for (const scope of SCOPES) {
      expect(
        scopeQuestions.filter((q) => q.scope === scope).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no repeated prompt', () => {
    const prompts = scopeQuestions.map((q) => q.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('keeps scenarios consistent with the lesson table (rented lines are WAN-style, owned city networks are MAN)', () => {
    for (const q of scopeQuestions) {
      if (/rent/i.test(q.prompt)) expect(q.scope, q.prompt).toBe('WAN');
      if (q.scope === 'MAN') expect(q.prompt, q.prompt).not.toMatch(/offices/);
    }
  });

  it('never reasons from ownership to a LAN or MAN verdict (the lesson says one owner points to a LAN)', () => {
    for (const q of scopeQuestions) {
      expect(q.why, q.prompt).not.toMatch(/ownership agrees/i);
      if (q.scope === 'MAN') {
        // Saying that ownership does NOT settle it is fine; leaning on it is not.
        const text = q.why.replace('Ownership alone would not settle it', '');
        expect(text, q.prompt).not.toMatch(/\bown(s|ed|er|ership)?\b|runs it/i);
      }
    }
  });

  it('bases every explanation on distance or on the rule of thumb for the scope', () => {
    for (const q of scopeQuestions) {
      expect(q.why, q.prompt).toMatch(/km|metre|kilometre|distance/i);
    }
  });

  it('never calls a scenario link "a WAN" outright in an explanation (WAN-scale only)', () => {
    for (const q of scopeQuestions) {
      expect(q.why, q.prompt).not.toMatch(/is a WAN(?!-)/);
    }
  });

  it('classifies every scenario the same way as its own distance', () => {
    for (const q of scopeQuestions) {
      expect(scopeForDistance(q.km), q.prompt).toBe(q.scope);
    }
  });

  it('keeps every scenario well away from a boundary (at least a factor of 2)', () => {
    const edges = [0.01, 2, 100];
    for (const q of scopeQuestions) {
      for (const edge of edges) {
        const ratio = q.km / edge;
        expect(ratio <= 0.5 || ratio >= 2, q.prompt).toBe(true);
      }
    }
  });
});

describe('generateScopeProblem', () => {
  it('is the same for the same seed and can differ for another seed', () => {
    expect(generateScopeProblem(createRng(7))).toEqual(
      generateScopeProblem(createRng(7)),
    );
    const ids = new Set(
      Array.from(
        { length: 40 },
        (_, s) => generateScopeProblem(createRng(s)).id,
      ),
    );
    expect(ids.size).toBeGreaterThan(5);
  });

  it('has an answer equal to the index of the scenario scope in the list', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const p = generateScopeProblem(createRng(seed));
      const q = scopeQuestions.find((s) => p.prompt.startsWith(s.prompt));
      if (q === undefined)
        throw new Error('prompt does not start with a scenario');
      expect(p.answer).toBe(SCOPES.indexOf(q.scope));
      expect(p.tolerance).toBe(0);
    }
  });

  it('lists the options and says how to answer', () => {
    const p = generateScopeProblem(createRng(1));
    expect(p.prompt).toContain('0 = PAN, 1 = LAN, 2 = MAN, 3 = WAN');
    expect(p.prompt).toContain('Type 0, 1, 2 or 3');
    expect(p.prompt).toContain('distance rules of thumb');
  });

  it('explains why, naming the scope and its number', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const p = generateScopeProblem(createRng(seed));
      const scope = SCOPES[p.answer];
      expect(p.explanation).toContain(`${String(p.answer)} (${scope ?? ''})`);
      expect(p.explanation.length).toBeGreaterThan(60);
    }
  });

  it('checks right and wrong typed answers', () => {
    const p = generateScopeProblem(createRng(3));
    expect(checkAnswer(p, String(p.answer)).correct).toBe(true);
    expect(checkAnswer(p, String((p.answer + 1) % 4)).correct).toBe(false);
  });

  it('gives unique ids inside a session, even for a long one', () => {
    const problems = buildProblems(generateScopeProblem, createRng(5), 20);
    expect(problems).not.toBeNull();
    const ids = (problems ?? []).map((p) => p.id);
    expect(new Set(ids).size).toBe(20);
  });
});

describe('kmFromSlider and formatDistance', () => {
  it('maps the ends of the slider to 1 metre and 20 000 km', () => {
    expect(kmFromSlider(0)).toBe(0.001);
    expect(kmFromSlider(SLIDER_MAX)).toBe(20000);
  });

  it('never goes down as the slider goes up', () => {
    let last = 0;
    for (let p = 0; p <= SLIDER_MAX; p += 1) {
      const km = kmFromSlider(p);
      expect(km).toBeGreaterThanOrEqual(last);
      last = km;
    }
  });

  it('clamps positions outside the slider and rejects NaN', () => {
    expect(kmFromSlider(-5)).toBe(0.001);
    expect(kmFromSlider(SLIDER_MAX + 50)).toBe(20000);
    expect(() => kmFromSlider(Number.NaN)).toThrow(RangeError);
    expect(() => kmFromSlider(Infinity)).toThrow(RangeError);
  });

  it('can reach every scope, 5 m and 5000 km included', () => {
    const reached = new Set<Scope>();
    for (let p = 0; p <= SLIDER_MAX; p += 1) {
      reached.add(scopeForDistance(kmFromSlider(p)));
    }
    expect([...reached].sort()).toEqual([...SCOPES].sort());
    const kms = Array.from({ length: SLIDER_MAX + 1 }, (_, p) =>
      kmFromSlider(p),
    );
    expect(kms.some((km) => km >= 0.004 && km <= 0.006)).toBe(true);
    expect(kms.some((km) => km >= 4000 && km <= 6000)).toBe(true);
  });

  it('rounds to 2 significant figures', () => {
    for (let p = 0; p <= SLIDER_MAX; p += 1) {
      const km = kmFromSlider(p);
      expect(km).toBe(Number(km.toPrecision(2)));
    }
  });

  it.each([
    [0.001, '1 m'],
    [0.005, '5 m'],
    [0.0125, '12.5 m'],
    [0.5, '500 m'],
    [0.999, '999 m'],
    [1, '1 km'],
    [2.5, '2.5 km'],
    [100, '100 km'],
    [5000, '5,000 km'],
    [20000, '20,000 km'],
  ])('formats %s km as %s', (km, text) => {
    expect(formatDistance(km)).toBe(text);
  });

  it('throws a RangeError for a bad distance', () => {
    expect(() => formatDistance(-1)).toThrow(RangeError);
    expect(() => formatDistance(Number.NaN)).toThrow(RangeError);
  });
});
