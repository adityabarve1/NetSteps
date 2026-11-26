import type { LessonId } from '../progress/types.ts';
import { level2 } from './levels/level2.ts';
import { level3 } from './levels/level3.ts';
import { level4 } from './levels/level4.ts';
import { level5 } from './levels/level5.ts';
import { level6 } from './levels/level6.ts';
import { level7 } from './levels/level7.ts';
import type { LessonMeta, LevelId, LevelMeta } from './types.ts';

// The course outline: 7 levels, 47 lessons, titles as in spec section 6.
//
// This file has no JSX and no "@/" imports on purpose. Task 22 runs it with
// tsx in plain Node to build the sitemap, so it may only use relative paths
// (with file endings) and type-only imports. Keep it that way.
//
// A lesson id is permanent: it is never renamed or reused once progress could
// exist. Every lesson starts `built: false`. The task that builds a lesson sets
// `built: true`, its real `minutes` and its `labIds` here (Level 1) or in
// levels/level<N>.ts (Levels 2 to 7), and registers a loader in loaders.ts.

const level1: LevelMeta = {
  id: 'level-1',
  number: 1,
  title: 'Basics',
  summary:
    'Learn what a network is, how networks are grouped by size and shape, and how data really travels from one device to another.',
  lessons: [
    {
      id: 'l1-what-is-a-network',
      levelId: 'level-1',
      title: 'What is a network',
      summary:
        'Connect a few devices yourself, then watch a message travel from one to another to see what makes a group of devices a network.',
      minutes: 20,
      built: true,
      labIds: ['lab-l1-first-network'],
    },
    {
      id: 'l1-lan-wan-man',
      levelId: 'level-1',
      title: 'LAN, WAN and MAN',
      summary:
        'Learn how networks are grouped by how far they reach, from your desk to far-apart cities, and sort everyday examples into the right group.',
      minutes: 25,
      built: true,
      labIds: ['lab-l1-classify'],
    },
    {
      id: 'l1-topologies',
      levelId: 'level-1',
      title: 'Topologies',
      summary:
        'See the common ways to arrange a network, then break a link or a device and watch which others can still talk.',
      minutes: 25,
      built: true,
      labIds: ['lab-l1-star'],
    },
    {
      id: 'l1-client-server-p2p',
      levelId: 'level-1',
      title: 'Client-server vs peer-to-peer',
      summary:
        'Compare a network where one main computer serves everyone with one where computers share with each other, and see what happens as more people join.',
      minutes: 40,
      built: true,
      labIds: ['lab-l1-server'],
    },
    {
      id: 'l1-bandwidth-latency',
      levelId: 'level-1',
      title: 'Bandwidth vs latency',
      summary:
        'Use sliders to see the difference between how much data a link can carry each second and how long a message takes to arrive.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l1-packet-vs-circuit',
      levelId: 'level-1',
      title: 'Packet vs circuit switching',
      summary:
        'Compare the old phone network, which reserved a line for each call, with the internet, which splits messages into small packets.',
      minutes: 15,
      built: false,
      labIds: [],
    },
  ],
};

export const curriculum: LevelMeta[] = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level6,
  level7,
];

// Finds a lesson only inside the level it belongs to, so a right lesson id under
// a wrong level id (a mismatched URL) finds nothing.
export function findLesson(
  levelId: LevelId,
  lessonId: LessonId,
): LessonMeta | undefined {
  return curriculum
    .find((level) => level.id === levelId)
    ?.lessons.find((lesson) => lesson.id === lessonId);
}
