import type { AxeMatchers } from 'vitest-axe/matchers';

// vitest-axe 0.1 still augments the legacy `Vi` namespace, so teach Vitest 5
// about `toHaveNoViolations` ourselves. Same pattern as @testing-library/jest-dom.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- declaration merging needs the same type parameters as Vitest's Assertion
  interface Assertion<R, T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging, no members to add
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
