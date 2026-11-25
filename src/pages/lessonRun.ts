import { createContext, useContext } from 'react';

// What a lesson's content may tell the page while the learner works through it.
export type LessonRun = {
  /**
   * A simulation reached its last step. Only the lesson's primary simulation
   * counts; any other id is ignored. Safe to call more than once.
   */
  markSimFinished: (simId: string) => void;
};

// Outside a lesson page (for example a simulation tested on its own) there is
// nothing to tell, so the default does nothing instead of throwing.
export const LessonRunContext = createContext<LessonRun>({
  markSimFinished: () => undefined,
});

// Used by simulations placed inside a lesson's sections:
//   const { markSimFinished } = useLessonRun();
//   <SimPlayer ... onFinished={markSimFinished} />
export function useLessonRun(): LessonRun {
  return useContext(LessonRunContext);
}
