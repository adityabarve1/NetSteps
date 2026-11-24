import type {
  Glossary,
  Lesson,
  LessonMeta,
  QuizQuestion,
} from '@/content/types';

// Small, valid stand-ins for a real lesson. The validation tests copy one and
// break exactly one rule at a time, so each rule is proven to fire on its own.

export const FIXTURE_ID = 'l1-fixture-lesson';

export function fixtureMeta(overrides: Partial<LessonMeta> = {}): LessonMeta {
  return {
    id: FIXTURE_ID,
    levelId: 'level-1',
    title: 'Fixture lesson',
    summary: 'A lesson used only by the tests.',
    minutes: 12,
    built: true,
    labIds: ['lab-fixture'],
    ...overrides,
  };
}

export function fixtureGlossary(): Glossary {
  return {
    packet: { term: 'packet', definition: 'A small piece of data.' },
    'subnet-mask': {
      term: 'subnet mask',
      definition: 'Marks which part of an address names the network.',
    },
  };
}

export function fixtureQuestion(n: number): QuizQuestion {
  return {
    id: `q${String(n)}`,
    prompt: `Question ${String(n)}?`,
    options: ['First', 'Second', 'Third'],
    correctIndex: n % 3,
    explanation: 'The right option is right. The others are not.',
  };
}

export function fixtureLesson(): Lesson {
  return {
    id: FIXTURE_ID,
    hook: 'You press play and the video starts. What just happened?',
    analogy: 'Houses on streets.',
    sections: [1, 2, 3, 4, 5].map((n) => ({
      id: `section-${String(n)}`,
      title: `Section ${String(n)}`,
      body: 'Body text.',
      ...(n === 2
        ? { deeper: [{ title: 'Deeper title', body: 'More detail.' }] }
        : {}),
    })),
    primarySimulationId: 'sim-fixture',
    tryIt: 'Move the slider.',
    labs: [{ id: 'lab-fixture', title: 'Fixture lab', render: () => null }],
    whyItMatters: 'It shows up everywhere.',
    quiz: [1, 2, 3, 4, 5].map(fixtureQuestion),
    recap: {
      oneLine: 'A network moves data.',
      takeaways: ['One.', 'Two.', 'Three.'],
      cheatSheet: 'A cheat sheet.',
    },
    glossary: ['packet', 'subnet-mask'],
  };
}
