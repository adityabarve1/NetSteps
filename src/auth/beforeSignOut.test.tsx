// signOut() first gives registered handlers (the progress provider's final flush)
// a bounded chance to finish, then ALWAYS signs out.
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { BEFORE_SIGN_OUT_TIMEOUT_MS } from '@/auth/beforeSignOut';
import { useAuth } from '@/auth/useAuth';
import { createFakeSupabase, deferred, fakeSession } from '@/test/fakeSupabase';

function setup(timeoutMs?: number) {
  const fake = createFakeSupabase({ session: fakeSession() });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider client={fake.client} beforeSignOutTimeoutMs={timeoutMs}>
      {children}
    </AuthProvider>
  );
  return { fake, ...renderHook(() => useAuth(), { wrapper }) };
}
const signedIn = (result: { current: { status: string } }) =>
  waitFor(() => {
    expect(result.current.status).toBe('signed-in');
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('the contract', () => {
  it('waits at most 3 seconds by default', () => {
    expect(BEFORE_SIGN_OUT_TIMEOUT_MS).toBe(3000);
  });

  it('with no handler registered, signOut is exactly what it was', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    await act(async () => {
      await result.current.signOut();
    });
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.status).toBe('signed-out');
    expect(result.current.user).toBeNull();
  });

  it('keeps one stable registerBeforeSignOut across renders', async () => {
    const { result, rerender } = setup();
    await signedIn(result);
    const first = result.current.registerBeforeSignOut;
    rerender();
    expect(result.current.registerBeforeSignOut).toBe(first);
  });
});

describe('handlers run first, and sign-out waits for them', () => {
  it('runs the handler before the local sign-out', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    const order: string[] = [];
    const gate = deferred<undefined>();
    result.current.registerBeforeSignOut(async () => {
      order.push('handler started');
      await gate.promise;
      order.push('handler finished');
    });
    fake.signOut.mockImplementationOnce(() => {
      order.push('signed out');
      return Promise.resolve({ error: null });
    });

    let finished = false;
    const signingOut = act(async () => {
      await result.current.signOut();
      finished = true;
    });
    await vi.waitFor(() => {
      expect(order).toEqual(['handler started']);
    });
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(finished).toBe(false);

    gate.resolve(undefined);
    await signingOut;
    expect(order).toEqual([
      'handler started',
      'handler finished',
      'signed out',
    ]);
    expect(result.current.status).toBe('signed-out');
  });

  it('runs every handler, even when one throws or rejects, then signs out', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    const ran: string[] = [];
    result.current.registerBeforeSignOut(() => {
      ran.push('throws');
      throw new Error('sync boom');
    });
    result.current.registerBeforeSignOut(() => {
      ran.push('rejects');
      return Promise.reject(new Error('async boom'));
    });
    result.current.registerBeforeSignOut(() => {
      ran.push('fine');
      return Promise.resolve();
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(ran.sort()).toEqual(['fine', 'rejects', 'throws']);
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.status).toBe('signed-out');
  });

  it('does not call a handler that was unregistered', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    const handler = vi.fn(() => Promise.resolve());
    const unregister = result.current.registerBeforeSignOut(handler);
    unregister();
    await act(async () => {
      await result.current.signOut();
    });
    expect(handler).not.toHaveBeenCalled();
    expect(fake.signOut).toHaveBeenCalled();
  });
});

describe('sign-out always completes', () => {
  it('a handler that never finishes delays it by the timeout and no more', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    result.current.registerBeforeSignOut(
      () => new Promise<void>(() => undefined),
    );

    vi.useFakeTimers();
    let finished = false;
    const signingOut = act(async () => {
      await result.current.signOut();
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(BEFORE_SIGN_OUT_TIMEOUT_MS - 1);
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(finished).toBe(false);

    await vi.advanceTimersByTimeAsync(2);
    await signingOut;
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(finished).toBe(true);
    vi.useRealTimers();
    expect(result.current.status).toBe('signed-out');
  });

  it('the timeout is injectable', async () => {
    const { fake, result } = setup(50);
    await signedIn(result);
    result.current.registerBeforeSignOut(
      () => new Promise<void>(() => undefined),
    );
    vi.useFakeTimers();
    const signingOut = act(async () => {
      await result.current.signOut();
    });
    await vi.advanceTimersByTimeAsync(51);
    await signingOut;
    expect(fake.signOut).toHaveBeenCalled();
  });

  it('still signs out when the handler fails because the network is down', async () => {
    const { fake, result } = setup();
    await signedIn(result);
    result.current.registerBeforeSignOut(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    );
    fake.signOut.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => {
      await expect(result.current.signOut()).resolves.toBeUndefined();
    });
    expect(result.current.status).toBe('signed-out');
  });

  it('leaves no timer running once the handlers are done', async () => {
    const { result } = setup();
    await signedIn(result);
    result.current.registerBeforeSignOut(() => Promise.resolve());
    vi.useFakeTimers();
    await act(async () => {
      await result.current.signOut();
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
