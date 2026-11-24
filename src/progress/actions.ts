// What happens when the learner does something: the next progress state, and the
// store writes that change calls for. Built on the pure rules in logic.ts, with
// the time passed in (`at`), so this stays plain, testable TypeScript.
import {
  completeLab,
  completeLesson,
  isValidQuiz,
  openLesson,
  startLab,
  submitQuiz,
} from '@/progress/logic';
import type {
  LabRecord,
  LessonId,
  LessonRecord,
  ProgressState,
} from '@/progress/types';

export type ProgressAction =
  | { type: 'open'; id: LessonId; at: string }
  | { type: 'quiz'; id: LessonId; score: number; total: number; at: string }
  | { type: 'complete'; id: LessonId; at: string }
  | { type: 'startLab'; id: string; at: string }
  | { type: 'completeLab'; id: string; at: string };

export type ProgressWrite =
  | { kind: 'lesson'; id: LessonId; record: LessonRecord }
  | { kind: 'quiz'; id: LessonId; score: number; total: number; at: string }
  | { kind: 'lab'; id: string; record: LabRecord };

export interface ActionResult {
  next: ProgressState;
  writes: ProgressWrite[];
}

const unchanged = (state: ProgressState): ActionResult => ({
  next: state,
  writes: [],
});

// Reads an own entry only, so an id such as "constructor" is never mistaken for
// a record inherited from Object.prototype.
function lessonWrite(state: ProgressState, id: LessonId): ProgressWrite[] {
  const record = Object.hasOwn(state.lessons, id)
    ? state.lessons[id]
    : undefined;
  return record === undefined ? [] : [{ kind: 'lesson', id, record }];
}

function labWrite(state: ProgressState, id: string): ProgressWrite[] {
  const record = Object.hasOwn(state.labs, id) ? state.labs[id] : undefined;
  return record === undefined ? [] : [{ kind: 'lab', id, record }];
}

// Only a change is written. A call that changes nothing (the logic hands back
// the very same state) writes nothing.
export function applyAction(
  state: ProgressState,
  action: ProgressAction,
): ActionResult {
  switch (action.type) {
    case 'open': {
      const next = openLesson(state, action.id, action.at);
      return next === state
        ? unchanged(state)
        : { next, writes: lessonWrite(next, action.id) };
    }
    case 'complete': {
      const next = completeLesson(state, action.id, action.at);
      return next === state
        ? unchanged(state)
        : { next, writes: lessonWrite(next, action.id) };
    }
    case 'startLab': {
      const next = startLab(state, action.id, action.at);
      return next === state
        ? unchanged(state)
        : { next, writes: labWrite(next, action.id) };
    }
    case 'completeLab': {
      const next = completeLab(state, action.id, action.at);
      return next === state
        ? unchanged(state)
        : { next, writes: labWrite(next, action.id) };
    }
    case 'quiz': {
      // A result that cannot be real changes nothing and is never written.
      if (!isValidQuiz({ score: action.score, total: action.total })) {
        return unchanged(state);
      }
      const next = submitQuiz(
        state,
        action.id,
        action.score,
        action.total,
        action.at,
      );
      // Every valid submit is one attempt; the lesson only when it changed.
      const attempt: ProgressWrite = {
        kind: 'quiz',
        id: action.id,
        score: action.score,
        total: action.total,
        at: action.at,
      };
      return {
        next,
        writes:
          next === state
            ? [attempt]
            : [...lessonWrite(next, action.id), attempt],
      };
    }
  }
}
