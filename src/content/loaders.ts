import type { LessonId } from '@/progress/types';
import type { Lesson } from './types';

export type LessonLoader = () => Promise<{ default: Lesson }>;
export type LessonLoaders = Readonly<Record<LessonId, LessonLoader>>;

// Built lessons, by id. Each lesson loads as its own chunk, only when someone
// opens it. Each Level 1 lesson task adds its line, for example:
//   'l1-what-is-a-network': () => import('./lessons/level1/what-is-a-network'),
// An entry here and `built: true` in curriculum.ts always go together (a test
// checks they agree).
const lessonLoaders: LessonLoaders = {
  'l1-what-is-a-network': () => import('./lessons/level1/what-is-a-network'),
  // l1-lan-wan-man
  'l1-lan-wan-man': () => import('./lessons/level1/lan-wan-man'),
  // l1-topologies
  'l1-topologies': () => import('./lessons/level1/topologies'),
  // l1-client-server-p2p
  'l1-client-server-p2p': () => import('./lessons/level1/client-server-p2p'),
  // l1-bandwidth-latency
  'l1-bandwidth-latency': () => import('./lessons/level1/bandwidth-latency'),
  // l1-packet-vs-circuit
  'l1-packet-vs-circuit': () => import('./lessons/level1/packet-vs-circuit'),
};

export function registeredLessonIds(): LessonId[] {
  return Object.keys(lessonLoaders);
}

// Looks `id` up in `loaders`. Returns undefined for an unregistered id, and also
// when the import fails (for example a chunk that could not be downloaded), so
// callers have one "no lesson" case to handle and nothing throws.
export async function loadFromLoaders(
  loaders: LessonLoaders,
  id: LessonId,
): Promise<Lesson | undefined> {
  // Own keys only: "constructor" or "__proto__" must not count as a lesson.
  if (!Object.hasOwn(loaders, id)) return undefined;
  try {
    const load = loaders[id];
    return load === undefined ? undefined : (await load()).default;
  } catch {
    return undefined;
  }
}

export function loadLesson(id: LessonId): Promise<Lesson | undefined> {
  return loadFromLoaders(lessonLoaders, id);
}
