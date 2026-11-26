import type { Glossary } from '../types';
import { level1 } from './level1';
import { level1ClientServer } from './level1ClientServer';
import { level1PacketCircuit } from './level1PacketCircuit';

// Every term in the course. Later levels add their own file and spread it here.
export const glossary: Glossary = {
  ...level1,
  ...level1ClientServer,
  ...level1PacketCircuit,
};
