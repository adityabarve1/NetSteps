// Joins class names, skipping the ones that are off. CSS Modules give back
// `string | undefined` for every name, so this also keeps the types happy.
export function cx(...parts: (string | false | undefined)[]): string {
  return parts
    .filter((part) => part !== false && part !== undefined && part !== '')
    .join(' ');
}
