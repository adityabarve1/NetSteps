import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';

// Two simulations side by side: only 'sim-main' is the lesson's primary one.
export function Sims() {
  const { markSimFinished } = useLessonRun();
  return (
    <>
      {(['sim-main', 'sim-other'] as const).map((id) => (
        <SimPlayer
          key={id}
          id={id}
          label={id}
          steps={[{ n: 1 }, { n: 2 }]}
          caption={(s) => `${id} step ${String(s.n)}`}
          render={(s) => `${id} picture ${String(s.n)}`}
          onFinished={markSimFinished}
        />
      ))}
    </>
  );
}
