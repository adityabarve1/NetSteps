import { describe, expect, it } from 'vitest';
import {
  createRng,
  generatePacketProblem,
  isValidProblem,
} from '@/labs/practice';

describe('generatePacketProblem', () => {
  it('is deterministic per seed', () => {
    expect(generatePacketProblem(createRng(9))).toEqual(
      generatePacketProblem(createRng(9)),
    );
  });

  it('writes the prompt in the planned words', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const p = generatePacketProblem(createRng(seed));
      const size = String(p.params.sizeKB);
      const payload = String(p.params.payload);
      expect(p.prompt).toBe(
        `A ${size} KB message is sent with at most ${payload} bytes per packet: how many packets?`,
      );
    }
  });

  it('holds over 2000 seeds: valid, answer is the rounded-up division', () => {
    const ids = new Set<string>();
    let uneven = 0;
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generatePacketProblem(createRng(seed));
      expect(isValidProblem(p)).toBe(true);
      const sizeKB = p.params.sizeKB ?? 0;
      const payload = p.params.payload ?? 1;
      expect(p.answer).toBe(Math.ceil((sizeKB * 1000) / payload));
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.answer).toBeGreaterThanOrEqual(2);
      expect(p.answer).toBeLessThanOrEqual(100);
      expect(p.tolerance).toBe(0);
      expect(p.unit).toBe('packets');
      if ((sizeKB * 1000) % payload !== 0) uneven += 1;
      ids.add(p.id);
    }
    expect(ids.size).toBeGreaterThan(30);
    // Rounding up must really be tested: many problems are not exact.
    expect(uneven).toBeGreaterThan(200);
  });

  it('explains the rounding up with the real numbers', () => {
    const p = generatePacketProblem(createRng(4));
    const bytes = String((p.params.sizeKB ?? 0) * 1000);
    expect(p.explanation).toContain('1 KB is 1000 bytes');
    expect(p.explanation).toContain(`${bytes} bytes`);
    expect(p.explanation).toContain(String(p.answer));
  });

  it('never uses the same id for different parameters', () => {
    const byId = new Map<string, string>();
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generatePacketProblem(createRng(seed));
      const key = JSON.stringify(p.params);
      expect(byId.get(p.id) ?? key).toBe(key);
      byId.set(p.id, key);
    }
  });
});
