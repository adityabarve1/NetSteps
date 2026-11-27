import { useCallback, useSyncExternalStore } from 'react';

/**
 * True while the window is at most `maxWidthRem` wide (default 30rem, a phone).
 * A lesson simulation calls this to draw a compact, vertical version instead of
 * shrinking a wide drawing until its text is unreadable:
 *
 *   const compact = useCompactLayout();
 *   render={(step) => (compact ? <VerticalDiagram step={step} /> : <WideDiagram step={step} />)}
 *
 * Updates live when the window is resized. Like `useReducedMotion`, it is false
 * (the wide drawing) when `matchMedia` is missing and on the server.
 */
export function useCompactLayout(maxWidthRem = 30): boolean {
  const query = `(max-width: ${String(maxWidthRem)}rem)`;

  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  const getSnapshot = useCallback(
    (): boolean =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
