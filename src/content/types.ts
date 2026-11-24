import type { ReactNode } from 'react';
import type { LessonId } from '../progress/types.ts';

// The content model. Only type imports, with relative paths and file endings,
// so curriculum.ts can import it when a Node script (tsx) runs the curriculum.

// 'level-1' to 'level-7'.
export type LevelId = string;

// What the course map needs to know about a lesson without loading it.
export type LessonMeta = {
  id: LessonId;
  levelId: LevelId;
  title: string;
  summary: string;
  minutes: number;
  // True once the lesson exists in code and has a loader in loaders.ts.
  built: boolean;
  // Ids of the labs the lesson contains. Empty until the lesson is built, and
  // equal to the ids in `Lesson.labs` after that.
  labIds: string[];
};

export type LevelMeta = {
  id: LevelId;
  number: number;
  title: string;
  summary: string;
  lessons: LessonMeta[];
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  // Why the right answer is right and why each other answer is not.
  explanation: string;
};

export type DeeperBlock = { title: string; body: ReactNode };

export type LessonSectionData = {
  id: string;
  title: string;
  body: ReactNode;
  deeper?: DeeperBlock[];
};

export type LabDefinition = {
  id: string;
  title: string;
  render: (ctx: { onDone: () => void }) => ReactNode;
};

export type Recap = {
  oneLine: string;
  takeaways: string[];
  cheatSheet: ReactNode;
};

// One lesson, following the 10-part recipe of spec section 7.
export type Lesson = {
  id: LessonId;
  hook: string;
  analogy: ReactNode;
  sections: LessonSectionData[];
  primarySimulationId: string;
  tryIt: ReactNode;
  labs: LabDefinition[];
  realComputer?: ReactNode;
  whyItMatters: ReactNode;
  quiz: QuizQuestion[];
  recap: Recap;
  // Ids of the glossary terms the lesson uses.
  glossary: string[];
};

export type GlossaryEntry = { term: string; definition: string };

// Keyed by a kebab-case id such as `packet` or `subnet-mask`.
export type Glossary = Record<string, GlossaryEntry>;
