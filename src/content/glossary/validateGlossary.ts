import { isKebabCase } from '../kebab';
import type { Glossary } from '../types';

// Checks the shape of the glossary: kebab-case ids, and a term and a definition
// on every entry. Returns one sentence per problem; empty means all good.
export function validateGlossary(glossary: Glossary): string[] {
  const problems: string[] = [];
  for (const [id, entry] of Object.entries(glossary)) {
    if (!isKebabCase(id)) {
      problems.push(
        `glossary id "${id}" is not kebab-case (like "subnet-mask")`,
      );
    }
    if (entry.term.trim() === '')
      problems.push(`glossary "${id}" needs a term`);
    if (entry.definition.trim() === '') {
      problems.push(`glossary "${id}" needs a definition`);
    }
  }
  return problems;
}
