import { useLessonRun } from '@/pages/lessonRun';
import { SimPlayer } from '@/sim/SimPlayer';
import { useCompactLayout } from '@/sim/useCompactLayout';
import { TopologyDiagram } from './diagram';
import {
  TOPOLOGY_STEPS,
  sceneDescription,
  topologyOf,
  type TopologyStep,
} from './steps';

/** The lesson's primary simulation. Must equal `lesson.primarySimulationId`. */
export const TOPOLOGY_SIM_ID = 'sim-l1-topology';

/** One frame of the simulation: the step's shape with its failure drawn in. */
export function TopologyFrame({
  step,
  reducedMotion,
}: {
  step: TopologyStep;
  reducedMotion: boolean;
}) {
  const compact = useCompactLayout();
  const topology = topologyOf(step.kind);
  return (
    <TopologyDiagram
      topology={topology}
      broken={step.broken}
      ok={step.ok}
      compact={compact}
      reducedMotion={reducedMotion}
      label={sceneDescription(topology, step.broken, step.ok)}
    />
  );
}

/** Each shape in turn, then two failures: what stops, and what carries on. */
export function TopologySim() {
  const { markSimFinished } = useLessonRun();
  return (
    <SimPlayer
      id={TOPOLOGY_SIM_ID}
      label="Simulation: four network shapes and what happens when a part breaks"
      steps={TOPOLOGY_STEPS}
      caption={(s) => s.caption}
      render={(s, { reducedMotion }) => (
        <TopologyFrame step={s} reducedMotion={reducedMotion} />
      )}
      onFinished={markSimFinished}
      stepMs={4200}
    />
  );
}
