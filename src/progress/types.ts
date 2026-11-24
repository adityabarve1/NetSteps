// The shape of saved progress. Plain data only, so the same object can be kept
// in localStorage and mapped to Supabase rows. Every time is an ISO 8601 string
// such as "2026-11-24T10:00:00.000Z"; the logic never reads the clock itself.

export type LessonId = string;

// The least the progress logic needs to know about a level, so it does not
// depend on the content module. The curriculum's level type satisfies it.
export type CurriculumLevel = { lessons: { id: LessonId; built: boolean }[] };

// A quiz result. `score` is how many answers were right, out of `total`.
export type QuizBest = { score: number; total: number };

export type LessonRecord = {
  status: 'in_progress' | 'completed';
  lastOpenedAt: string;
  completedAt?: string;
  quizBest?: QuizBest;
};

export type LabRecord = {
  status: 'started' | 'completed';
  completedAt?: string;
};

// Contract: the functions in logic.ts require a well-shaped state (both tables
// present, every record valid). Anything loaded from localStorage or from
// Supabase MUST go through `parseProgress` (parse.ts) first; it never throws and
// always returns a state that satisfies this contract.
export type ProgressState = {
  lessons: Record<LessonId, LessonRecord>;
  labs: Record<string, LabRecord>;
};
