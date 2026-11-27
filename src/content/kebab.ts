const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// True for ids like "subnet-mask": lower-case letters and digits in groups
// joined by single hyphens. Used for glossary ids and lesson section ids.
export function isKebabCase(text: string): boolean {
  return KEBAB_CASE.test(text);
}
