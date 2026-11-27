import type { Glossary, GlossaryEntry } from '../types';

// Finds a term by its id. Only the glossary's own keys count, so ids such as
// "constructor" or "__proto__" find nothing instead of an object built-in.
export function lookupTerm(
  glossary: Glossary,
  id: string,
): GlossaryEntry | undefined {
  return Object.hasOwn(glossary, id) ? glossary[id] : undefined;
}
