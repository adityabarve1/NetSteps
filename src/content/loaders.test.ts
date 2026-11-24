import { describe, expect, it } from 'vitest';
import { fixtureLesson } from '@/test/lessonFixtures';
import { loadFromLoaders, loadLesson, registeredLessonIds } from './loaders';
import type { LessonLoader } from './loaders';

const lesson = fixtureLesson();
const good: LessonLoader = () => Promise.resolve({ default: lesson });

describe('loadFromLoaders', () => {
  it('returns the lesson a registered loader imports', async () => {
    expect(
      await loadFromLoaders({ 'l1-fixture-lesson': good }, 'l1-fixture-lesson'),
    ).toBe(lesson);
  });

  it('returns undefined for an id nobody registered', async () => {
    expect(
      await loadFromLoaders({ 'l1-fixture-lesson': good }, 'l1-other'),
    ).toBeUndefined();
    expect(await loadFromLoaders({}, '')).toBeUndefined();
  });

  it('does not treat object built-ins as registered lessons', async () => {
    for (const id of [
      'constructor',
      'toString',
      '__proto__',
      'hasOwnProperty',
    ]) {
      expect(await loadFromLoaders({}, id), id).toBeUndefined();
    }
  });

  it("counts only the registry's own entries, not inherited ones", async () => {
    const registry: Record<string, LessonLoader> = {};
    Object.setPrototypeOf(registry, { 'l1-inherited': good });
    expect(await loadFromLoaders(registry, 'l1-inherited')).toBeUndefined();
  });

  it('returns undefined, and does not throw, when the import rejects', async () => {
    const rejects: LessonLoader = () =>
      Promise.reject(new Error('chunk failed'));
    expect(await loadFromLoaders({ a: rejects }, 'a')).toBeUndefined();
  });

  it('returns undefined when the loader itself throws', async () => {
    const throws: LessonLoader = () => {
      throw new Error('boom');
    };
    expect(await loadFromLoaders({ a: throws }, 'a')).toBeUndefined();
  });
});

describe('loadLesson with the real registry', () => {
  it('returns undefined for unknown and odd ids', async () => {
    expect(await loadLesson('l9-nope')).toBeUndefined();
    expect(await loadLesson('')).toBeUndefined();
    expect(await loadLesson('constructor')).toBeUndefined();
  });

  it('returns undefined for a lesson that exists but is not built', async () => {
    expect(await loadLesson('l2-switches')).toBeUndefined();
  });

  it('lists the ids it can load', () => {
    expect(Array.isArray(registeredLessonIds())).toBe(true);
  });
});
