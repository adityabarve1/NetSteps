import { describe, expect, it } from 'vitest';
import {
  binaryToDecimal,
  buildProblems,
  createRng,
  generateBinaryDecimal,
  generateTransferTime,
  isValidProblem,
  transferSeconds,
  type Problem,
} from '@/labs/practice';

const round2 = (n: number) => Math.round(n * 100) / 100;
const decimals = (n: number) => (String(n).split('.')[1] ?? '').length;

describe('generateTransferTime', () => {
  it('is deterministic per seed', () => {
    expect(generateTransferTime(createRng(9))).toEqual(
      generateTransferTime(createRng(9)),
    );
  });

  it('writes a plain English prompt that spells out the units', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const p = generateTransferTime(createRng(seed));
      const size = String(p.params.sizeMB);
      const speed = String(p.params.mbps);
      expect(p.prompt).toBe(
        `A file is ${size} megabytes (MB). Your connection runs at ${speed} megabits per second (Mbps). How many seconds does the download take? Ignore delays and give your answer in seconds.`,
      );
    }
  });

  it('teaches the bits step in the explanation, with the real numbers', () => {
    const p = generateTransferTime(createRng(3));
    const size = String(p.params.sizeMB);
    const speed = String(p.params.mbps);
    const megabits = String((p.params.sizeMB ?? 0) * 8);
    expect(p.explanation).toContain('1 byte is 8 bits');
    expect(p.explanation).toContain(`${size} MB is ${megabits} megabits`);
    expect(p.explanation).toContain(
      `${megabits} megabits divided by ${speed} megabits per second is ${String(p.answer)} seconds`,
    );
  });

  it('holds over 2000 seeds: valid, matches the formula, clean and sensible', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generateTransferTime(createRng(seed));
      expect(isValidProblem(p)).toBe(true);
      const { sizeMB, mbps } = p.params;
      expect(typeof sizeMB).toBe('number');
      expect(p.answer).toBe(round2(transferSeconds(sizeMB ?? 0, mbps ?? 1)));
      expect(decimals(p.answer)).toBeLessThanOrEqual(2);
      expect(p.answer).toBeGreaterThanOrEqual(0.5);
      expect(p.answer).toBeLessThanOrEqual(2000);
      expect(p.unit).toBe('seconds');
      expect(p.tolerance).toBe(0.01);
      ids.add(p.id);
    }
    // Many different problems, not one repeated.
    expect(ids.size).toBeGreaterThan(40);
  });

  it('never uses the same id for different parameters', () => {
    const byId = new Map<string, string>();
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generateTransferTime(createRng(seed));
      const key = JSON.stringify(p.params);
      expect(byId.get(p.id) ?? key).toBe(key);
      byId.set(p.id, key);
    }
  });
});

describe('generateBinaryDecimal', () => {
  it('is deterministic per seed', () => {
    expect(generateBinaryDecimal(createRng(9))).toEqual(
      generateBinaryDecimal(createRng(9)),
    );
  });

  it('holds over 2000 seeds: 8 bits, not zero, matches binaryToDecimal', () => {
    const values = new Set<number>();
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generateBinaryDecimal(createRng(seed));
      expect(isValidProblem(p)).toBe(true);
      const bits = /\b[01]{8}\b/.exec(p.prompt)?.[0];
      expect(bits).toBeDefined();
      expect(p.answer).toBe(binaryToDecimal(bits ?? ''));
      expect(p.answer).toBeGreaterThanOrEqual(1);
      expect(p.answer).toBeLessThanOrEqual(255);
      expect(p.params.value).toBe(p.answer);
      expect(p.tolerance).toBe(0);
      values.add(p.answer);
    }
    expect(values.size).toBeGreaterThan(200);
  });

  it('shows the place values that are set', () => {
    const lines = new Map<number, string>();
    for (let seed = 0; seed < 1000; seed += 1) {
      const p = generateBinaryDecimal(createRng(seed));
      lines.set(p.answer, p.explanation);
    }
    expect(lines.get(192)).toContain('128 + 64 = 192');
    expect(lines.get(128)).toContain('128 place');
    expect(lines.get(255)).toContain(
      '128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255',
    );
  });
});

describe('isValidProblem', () => {
  const good: Problem = {
    id: 'x',
    prompt: 'p',
    answer: 1,
    tolerance: 0,
    explanation: 'e',
    params: {},
  };

  it('accepts a good problem', () => {
    expect(isValidProblem(good)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['empty id', { ...good, id: '' }],
    ['empty prompt', { ...good, prompt: '  ' }],
    ['empty explanation', { ...good, explanation: '' }],
    ['NaN answer', { ...good, answer: Number.NaN }],
    ['infinite answer', { ...good, answer: Infinity }],
    ['string answer', { ...good, answer: '1' }],
    ['negative tolerance', { ...good, tolerance: -1 }],
    ['NaN tolerance', { ...good, tolerance: Number.NaN }],
  ])('rejects %s', (_, bad) => {
    expect(isValidProblem(bad)).toBe(false);
  });
});

describe('buildProblems', () => {
  it('returns count valid problems with unique ids', () => {
    const list = buildProblems(generateBinaryDecimal, createRng(1), 5);
    expect(list).toHaveLength(5);
    expect(new Set(list?.map((p) => p.id)).size).toBe(5);
  });

  it('keeps ids unique even when the generator repeats itself', () => {
    const same: Problem = {
      id: 'same',
      prompt: 'p',
      answer: 1,
      tolerance: 0,
      explanation: 'e',
      params: {},
    };
    const list = buildProblems(() => same, createRng(1), 4);
    expect(list).toHaveLength(4);
    expect(new Set(list?.map((p) => p.id)).size).toBe(4);
  });

  it('returns null when the generator throws or returns junk', () => {
    const boom = () => {
      throw new Error('boom');
    };
    expect(buildProblems(boom, createRng(1), 3)).toBeNull();
    expect(buildProblems(() => ({}) as Problem, createRng(1), 3)).toBeNull();
    expect(
      buildProblems(() => null as unknown as Problem, createRng(1), 3),
    ).toBeNull();
  });
});
