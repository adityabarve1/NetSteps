import type { Glossary } from '../types';
import { level1 } from './level1';
import { level1ClientServer } from './level1ClientServer';

// Every term in the course. Later levels add their own file and spread it here.
export const glossary: Glossary = { ...level1, ...level1ClientServer };
