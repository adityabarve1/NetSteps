import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { useCompactLayout } from '@/sim/useCompactLayout';
import { scopeSteps } from './logic';
import { ScopeDiagram } from './scopeDiagram';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const SCOPE_SIM_ID = 'sim-l1-scope';

/** Rings grow from one person (PAN) to the whole world (WAN), one stage per step. */
export function ScopeSim() {
  const { markSimFinished } = useLessonRun();
  const compact = useCompactLayout();
  return (
    <SimPlayer
      id={SCOPE_SIM_ID}
      label="Simulation: networks from one person to the world"
      steps={scopeSteps}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <ScopeDiagram
          step={s}
          reducedMotion={reducedMotion}
          compact={compact}
        />
      )}
      onFinished={markSimFinished}
      stepMs={3200}
    />
  );
}
