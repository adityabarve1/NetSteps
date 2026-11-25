import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import LessonPage from '@/pages/LessonPage';
import { NavCapture } from '@/test/NavCapture';
import { fakeProgress } from '@/test/lessonTestKit';
import type { FakeProgress } from '@/test/lessonTestKit';
import { ProgressContext } from '@/progress/useProgress';

interface Options {
  progress?: FakeProgress;
  strict?: boolean;
}

// Renders the lesson route with a fake progress layer. StrictMode must be the
// root element for React to run effects twice, as it does in development.
export function renderLessonPage(path: string, options: Options = {}) {
  let go: (to: string) => void = () => undefined;
  const capture = (fn: (to: string) => void) => {
    go = fn;
  };
  const progress = options.progress ?? fakeProgress();
  const element = (value: FakeProgress) => {
    const tree = (
      <MemoryRouter initialEntries={[path]}>
        <ProgressContext value={value}>
          <NavCapture onReady={capture} />
          <main>
            <Routes>
              <Route path="/learn" element={<h1>Course map</h1>} />
              <Route
                path="/learn/:levelId/:lessonId"
                element={<LessonPage />}
              />
            </Routes>
          </main>
        </ProgressContext>
      </MemoryRouter>
    );
    return options.strict === true ? <StrictMode>{tree}</StrictMode> : tree;
  };
  const view = render(element(progress));
  return {
    progress,
    ...view,
    /** Changes the URL, as a link click would. */
    navigateTo: (to: string) => {
      act(() => {
        go(to);
      });
    },
    /** Re-renders with a new progress value, as the provider does when state changes. */
    setProgress: (next: FakeProgress) => {
      view.rerender(element(next));
    },
  };
}

// True when no progress function of the fake was called at all.
export function noProgressCalls(progress: FakeProgress): boolean {
  return [
    progress.openLesson,
    progress.submitQuiz,
    progress.completeLesson,
    progress.startLab,
    progress.completeLab,
  ].every((fn) => fn.mock.calls.length === 0);
}
