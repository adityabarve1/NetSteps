// Work that must finish before this device signs out, while the session is still
// good. The one user today is the progress provider: it sends the learner's
// queued writes, because once the session is gone they can no longer be sent.
//
// Sign-out must ALWAYS complete, so this never rejects and never waits longer than
// the timeout: a handler may throw, reject, or hang for ever (the network is down).

/** How long sign-out waits for the handlers. About three seconds. */
export const BEFORE_SIGN_OUT_TIMEOUT_MS = 3000;

export type BeforeSignOutHandler = () => Promise<void>;

// An async function, so a handler that throws before it returns a promise is
// turned into a rejection instead of escaping.
async function callSafely(handler: BeforeSignOutHandler): Promise<void> {
  await handler();
}

/**
 * Starts every handler together and waits until they have all settled or
 * `timeoutMs` has passed, whichever comes first. A handler still running when time
 * is up is left to finish on its own. The timer is cleared as soon as this returns,
 * so none outlives it.
 */
export async function runBeforeSignOut(
  handlers: ReadonlySet<BeforeSignOutHandler>,
  timeoutMs: number,
): Promise<void> {
  if (handlers.size === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeUp = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const settled = Promise.allSettled([...handlers].map(callSafely));
  try {
    await Promise.race([settled, timeUp]);
  } finally {
    clearTimeout(timer);
  }
}
