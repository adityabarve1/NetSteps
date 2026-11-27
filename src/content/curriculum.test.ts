import { describe, expect, it } from 'vitest';
import { curriculum, findLesson } from './curriculum';
import { registeredLessonIds } from './loaders';

const allLessons = curriculum.flatMap((level) => level.lessons);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Spec section 6, lesson by lesson. Level 1 is binding; later levels are pinned
// by count so a merge or split has to be a deliberate edit to this test.
const LEVEL_1 = [
  ['l1-what-is-a-network', 'What is a network'],
  ['l1-lan-wan-man', 'LAN, WAN and MAN'],
  ['l1-topologies', 'Topologies'],
  ['l1-client-server-p2p', 'Client-server vs peer-to-peer'],
  ['l1-bandwidth-latency', 'Bandwidth vs latency'],
  ['l1-packet-vs-circuit', 'Packet vs circuit switching'],
];

describe('curriculum levels', () => {
  it('has 7 levels, numbered 1 to 7 in order, with matching ids', () => {
    expect(curriculum.map((level) => level.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(curriculum.map((level) => level.id)).toEqual([
      'level-1',
      'level-2',
      'level-3',
      'level-4',
      'level-5',
      'level-6',
      'level-7',
    ]);
  });

  it('gives every level a title and a summary', () => {
    for (const level of curriculum) {
      expect(level.title.trim(), `${level.id} title`).not.toBe('');
      expect(level.summary.trim(), `${level.id} summary`).not.toBe('');
    }
  });

  it('follows the lesson counts of spec section 6 (47 lessons)', () => {
    expect(curriculum.map((level) => level.lessons.length)).toEqual([
      6, 6, 8, 6, 7, 6, 8,
    ]);
    expect(allLessons).toHaveLength(47);
  });

  it('has exactly the six agreed Level 1 lessons, in order', () => {
    const level1 = curriculum[0];
    expect(level1?.lessons.map((l) => [l.id, l.title])).toEqual(LEVEL_1);
  });
});

describe('curriculum lessons', () => {
  it('uses unique kebab-case ids with the l<level>- prefix of their level', () => {
    const ids = allLessons.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const level of curriculum) {
      for (const lesson of level.lessons) {
        expect(lesson.id, lesson.id).toMatch(KEBAB);
        expect(
          lesson.id.startsWith(`l${String(level.number)}-`),
          lesson.id,
        ).toBe(true);
        expect(lesson.levelId, lesson.id).toBe(level.id);
      }
    }
  });

  it('gives every lesson a unique, non-empty title and a summary', () => {
    const titles = allLessons.map((lesson) => lesson.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const lesson of allLessons) {
      expect(lesson.title.trim(), `${lesson.id} title`).not.toBe('');
      expect(lesson.summary.trim(), `${lesson.id} summary`).not.toBe('');
    }
  });

  it('gives every lesson a realistic minutes estimate of 8 to 60', () => {
    for (const lesson of allLessons) {
      expect(Number.isInteger(lesson.minutes), lesson.id).toBe(true);
      expect(lesson.minutes, lesson.id).toBeGreaterThanOrEqual(8);
      expect(lesson.minutes, lesson.id).toBeLessThanOrEqual(60);
    }
  });

  it('lists labs only on built lessons, and every built lesson has one', () => {
    for (const lesson of allLessons) {
      if (lesson.built) {
        expect(lesson.labIds.length, lesson.id).toBeGreaterThan(0);
      } else {
        expect(lesson.labIds, lesson.id).toEqual([]);
      }
    }
  });
});

describe('built lessons', () => {
  it('exist only in Level 1', () => {
    for (const level of curriculum.slice(1)) {
      for (const lesson of level.lessons) {
        expect(lesson.built, lesson.id).toBe(false);
      }
    }
  });

  it('are exactly the six Level 1 lessons', () => {
    const built = allLessons.filter((lesson) => lesson.built).map((l) => l.id);
    expect(built).toEqual([
      'l1-what-is-a-network',
      'l1-lan-wan-man',
      'l1-topologies',
      'l1-client-server-p2p',
      'l1-bandwidth-latency',
      'l1-packet-vs-circuit',
    ]);
  });

  it('are exactly the lessons that have a registered loader', () => {
    const built = allLessons.filter((lesson) => lesson.built).map((l) => l.id);
    expect(new Set(built)).toEqual(new Set(registeredLessonIds()));
    expect(built).toHaveLength(registeredLessonIds().length);
  });
});

describe('findLesson', () => {
  it('finds a lesson inside its own level', () => {
    const found = findLesson('level-1', 'l1-topologies');
    expect(found?.title).toBe('Topologies');
    expect(found?.levelId).toBe('level-1');
    expect(findLesson('level-2', 'l2-switches')?.title).toBe('Switches');
  });

  it('returns undefined when the lesson belongs to a different level', () => {
    expect(findLesson('level-1', 'l2-switches')).toBeUndefined();
    expect(findLesson('level-2', 'l1-topologies')).toBeUndefined();
  });

  it('returns undefined for unknown levels, lessons and odd ids', () => {
    expect(findLesson('level-9', 'x')).toBeUndefined();
    expect(findLesson('level-1', 'l1-nope')).toBeUndefined();
    expect(findLesson('', '')).toBeUndefined();
    expect(findLesson('level-1', 'constructor')).toBeUndefined();
    expect(findLesson('__proto__', '__proto__')).toBeUndefined();
    expect(findLesson('LEVEL-1', 'l1-topologies')).toBeUndefined();
  });

  it('finds every lesson in the curriculum through its own level', () => {
    for (const level of curriculum) {
      for (const lesson of level.lessons) {
        expect(findLesson(level.id, lesson.id)).toBe(lesson);
      }
    }
  });
});
