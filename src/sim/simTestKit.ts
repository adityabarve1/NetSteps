// Shared fixtures for the SimPlayer and useReducedMotion tests.
import { vi } from 'vitest';

export type TestStep = { n: number };

export const fourSteps: TestStep[] = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }];

export function caption(step: TestStep): string {
  return `Caption ${String(step.n)}.`;
}

// Plain text keeps the fixture free of JSX; it shows what render() was handed.
export function renderStep(
  step: TestStep,
  ctx: { index: number; reducedMotion: boolean },
): string {
  return `Picture ${String(step.n)} at ${String(ctx.index)} reduced=${String(ctx.reducedMotion)}`;
}

const originalMatchMedia = Object.getOwnPropertyDescriptor(
  window,
  'matchMedia',
);

/** Makes `prefers-reduced-motion: reduce` match (or not) until restoreMatchMedia(). */
export function setReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) =>
      ({
        matches: matches && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  });
}

export function restoreMatchMedia(): void {
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  }
}

/** Pretends the tab is hidden or visible and fires `visibilitychange`. */
export function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

export function resetVisibility(): void {
  Reflect.deleteProperty(document, 'visibilityState');
}
