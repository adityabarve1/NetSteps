// Fixtures and fakes for the lesson page tests. This file must NOT import
// LessonPage (or anything that imports the curriculum): the tests replace
// '@/content/curriculum' and '@/content/loaders' with the exports below, and a
// module that needs them while they are being built would wait on itself.
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Lesson, LessonMeta, LevelMeta } from '@/content/types';
import { Sims } from '@/test/LessonTestSims';
import { emptyProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import type { ProgressContextValue } from '@/progress/useProgress';
import { fiveQuestions } from '@/quiz/quizTestKit';

export const A = 'l1-fixture-a';
export const B = 'l1-fixture-b';
export const C_UNBUILT = 'l1-fixture-c';
export const D = 'l2-fixture-d';
export const E_UNBUILT = 'l2-fixture-e';

function meta(
  id: string,
  levelId: string,
  title: string,
  built: boolean,
): LessonMeta {
  return {
    id,
    levelId,
    title,
    summary: `${title} summary.`,
    minutes: 10,
    built,
    labIds: built ? ['lab-main'] : [],
  };
}

export const testCurriculum: LevelMeta[] = [
  {
    id: 'level-1',
    number: 1,
    title: 'Basics',
    summary: 'Level one.',
    lessons: [
      meta(A, 'level-1', 'Lesson A', true),
      meta(B, 'level-1', 'Lesson B', true),
      meta(C_UNBUILT, 'level-1', 'Lesson C', false),
    ],
  },
  {
    id: 'level-2',
    number: 2,
    title: 'Next steps',
    summary: 'Level two.',
    lessons: [
      meta(D, 'level-2', 'Lesson D', true),
      meta(E_UNBUILT, 'level-2', 'Lesson E', false),
    ],
  },
];

// Same contract as the real findLesson: only inside the level it belongs to.
export function testFindLesson(
  levelId: string,
  lessonId: string,
): LessonMeta | undefined {
  return testCurriculum
    .find((level) => level.id === levelId)
    ?.lessons.find((lesson) => lesson.id === lessonId);
}

export function makeLesson(
  id: string,
  overrides: Partial<Lesson> = {},
): Lesson {
  return {
    id,
    hook: 'You press play and the video starts. What just happened?',
    analogy: 'Houses on streets.',
    sections: [
      { id: 'basics', title: 'The basics', body: <Sims /> },
      {
        id: 'more',
        title: 'Going further',
        body: 'More text.',
        deeper: [{ title: 'Deeper title', body: 'Detail.' }],
      },
    ],
    primarySimulationId: 'sim-main',
    tryIt: 'Move the slider.',
    labs: [
      {
        id: 'lab-main',
        title: 'Main lab',
        render: ({ onDone }) => (
          <>
            <button type="button">Lab action</button>
            <button type="button" onClick={onDone}>
              Finish lab
            </button>
            <button
              type="button"
              onClick={() => {
                onDone();
                onDone();
              }}
            >
              Finish lab twice
            </button>
          </>
        ),
      },
    ],
    whyItMatters: 'It shows up everywhere.',
    quiz: fiveQuestions,
    recap: {
      oneLine: 'A network moves data.',
      takeaways: ['Takeaway one.', 'Takeaway two.'],
      cheatSheet: 'The cheat sheet.',
    },
    glossary: [],
    ...overrides,
  };
}

// What loadLesson(id) resolves with by default.
export function defaultLoad(id: string): Promise<Lesson | undefined> {
  return Promise.resolve([A, B, D].includes(id) ? makeLesson(id) : undefined);
}

export const loadLessonMock =
  vi.fn<(id: string) => Promise<Lesson | undefined>>(defaultLoad);

// The progress functions as spies. Declared as properties (not methods) so
// `expect(progress.openLesson)` is not an unbound-method error.
export interface FakeProgress extends Omit<
  ProgressContextValue,
  'openLesson' | 'submitQuiz' | 'completeLesson' | 'startLab' | 'completeLab'
> {
  openLesson: Mock<(id: string) => void>;
  submitQuiz: Mock<(id: string, score: number, total: number) => void>;
  completeLesson: Mock<(id: string) => void>;
  startLab: Mock<(id: string) => void>;
  completeLab: Mock<(id: string) => void>;
}

export function fakeProgress(
  state: ProgressState = emptyProgress(),
  ready = true,
): FakeProgress {
  return {
    state,
    ready,
    syncError: false,
    droppedCount: 0,
    openLesson: vi.fn(),
    submitQuiz: vi.fn(),
    completeLesson: vi.fn(),
    startLab: vi.fn(),
    completeLab: vi.fn(),
  };
}
