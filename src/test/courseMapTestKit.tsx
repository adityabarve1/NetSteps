import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AuthContext } from '@/auth/useAuth';
import type { AuthContextValue, AuthStatus } from '@/auth/useAuth';
import { curriculum } from '@/content/curriculum';
import type { LevelMeta } from '@/content/types';
import CourseMap from '@/pages/CourseMap';
import { emptyProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { ProgressContext } from '@/progress/useProgress';
import type { ProgressContextValue } from '@/progress/useProgress';

export const FIRST = 'l1-what-is-a-network';
export const SECOND = 'l1-lan-wan-man';
export const THIRD = 'l1-topologies';

// All six Level 1 lessons built; the first has two labs. Levels 2 to 7 are not
// built. A fixed copy, so the tests do not change each time a lesson is built.
export const level1Built: LevelMeta[] = curriculum.map((level, i) =>
  i === 0
    ? {
        ...level,
        lessons: level.lessons.map((lesson) => ({
          ...lesson,
          built: true,
          labIds: lesson.id === FIRST ? ['lab-a', 'lab-b'] : [],
        })),
      }
    : level,
);

// No lesson built at all (how the course started).
export const nothingBuilt: LevelMeta[] = curriculum.map((level) => ({
  ...level,
  lessons: level.lessons.map((lesson) => ({
    ...lesson,
    built: false,
    labIds: [],
  })),
}));

// Level 1 with only its first two lessons built.
export const partlyBuilt: LevelMeta[] = curriculum.map((level, i) =>
  i === 0
    ? {
        ...level,
        lessons: level.lessons.map((lesson) => ({
          ...lesson,
          built: lesson.id === FIRST || lesson.id === SECOND,
        })),
      }
    : level,
);

function authValue(status: AuthStatus): AuthContextValue {
  return {
    status,
    user:
      status === 'signed-in'
        ? { id: 'u1', email: 'ada@example.com', displayName: null }
        : null,
    passwordRecovery: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    deleteAccount: vi.fn(),
    registerBeforeSignOut: () => () => undefined,
  };
}

interface Options {
  status?: AuthStatus;
  levels?: LevelMeta[] | null;
  state?: ProgressState;
  ready?: boolean;
  syncError?: boolean;
}

export function renderCourseMap({
  status = 'signed-out',
  levels = level1Built,
  state = emptyProgress(),
  ready = true,
  syncError = false,
}: Options = {}) {
  const progress: ProgressContextValue = {
    state,
    ready,
    syncError,
    droppedCount: 0,
    openLesson: vi.fn(),
    submitQuiz: vi.fn(),
    completeLesson: vi.fn(),
    startLab: vi.fn(),
    completeLab: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <AuthContext value={authValue(status)}>
        <ProgressContext value={progress}>
          <main>
            {levels === null ? <CourseMap /> : <CourseMap levels={levels} />}
          </main>
        </ProgressContext>
      </AuthContext>
    </MemoryRouter>,
  );
}
