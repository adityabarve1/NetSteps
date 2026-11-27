import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/auth/useAuth';
import { applyAction } from '@/progress/actions';
import type { ProgressAction } from '@/progress/actions';
import { getSupabase } from '@/lib/supabase';
import { createLocalStore } from '@/progress/localStore';
import { emptyProgress } from '@/progress/logic';
import {
  adopt,
  beginSession,
  createRuntime,
  GUEST_KEY,
  identityKey,
  refresh,
  release,
} from '@/progress/runtime';
import type { Ready, Runtime } from '@/progress/runtime';
import type { StoreFactory } from '@/progress/store';
import { createSupabaseStore } from '@/progress/supabaseStore';
import { ProgressContext } from '@/progress/useProgress';
import type { ProgressContextValue } from '@/progress/useProgress';
import type { ProgressState } from '@/progress/types';
import { sendWrites } from '@/progress/writes';

const EMPTY: ProgressState = emptyProgress();
const isoNow = (): string => new Date().toISOString();

interface Slot {
  key: string;
  progress: ProgressState;
  complete: boolean;
}
interface Sync {
  key: string;
  error: boolean;
  dropped: number;
}

interface ProgressProviderProps {
  children: ReactNode;
  /** For tests. Left out, the app's real client is used; `null` means no Supabase project. */
  client?: SupabaseClient | null;
  /** For tests: fake stores. Left out, guests use localStorage and accounts use Supabase. */
  storeFactory?: StoreFactory;
  /** For tests: the clock. Must return a full ISO time with a zone. */
  now?: () => string;
}

export function ProgressProvider({
  children,
  client,
  storeFactory,
  now = isoNow,
}: ProgressProviderProps) {
  const auth = useAuth();
  const registerBeforeSignOut = auth.registerBeforeSignOut;
  const supabase = client === undefined ? getSupabase() : client;
  const factory = useMemo<StoreFactory>(
    () =>
      storeFactory ?? {
        guest: () => createLocalStore(),
        account: (userId) => {
          if (supabase === null)
            throw new Error('No Supabase project is configured');
          return createSupabaseStore(supabase, userId);
        },
      },
    [storeFactory, supabase],
  );
  const key = identityKey(
    auth.status,
    auth.user,
    storeFactory !== undefined || supabase !== null,
  );

  // Created once, on first render (the pattern React documents for lazy refs).
  const runtimeRef = useRef<Runtime | null>(null);
  runtimeRef.current ??= createRuntime(factory, now);

  const [slot, setSlot] = useState<Slot | null>(null);
  const [sync, setSync] = useState<Sync | null>(null);

  // When the learner changes, drop everything held for the old one in the same
  // render, so not even one frame shows the previous account's progress.
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setSlot(null);
    setSync(null);
  }

  useEffect(() => {
    const rt = runtimeRef.current;
    if (rt === null) return;
    rt.factory = factory;
    rt.now = now;
  });

  const publish = useCallback((ready: Ready) => {
    setSlot({
      key: ready.key,
      progress: ready.progress,
      complete: ready.complete,
    });
  }, []);

  // Load the identity. State is only set from callbacks, never in this body.
  useEffect(() => {
    const rt = runtimeRef.current;
    if (key === null || rt === null) return undefined;
    rt.latestKey = key;
    // React may run this effect twice in development; the session is reused, so
    // the account is read, merged and flushed once.
    rt.session = rt.session?.key === key ? rt.session : beginSession(rt, key);
    const session = rt.session;
    let active = true;

    const store = session.store;
    // Signing out drops the session, and with it the ability to send queued
    // writes. So while this account is shown, sign-out first gives the store a
    // bounded chance to send them (the flush shares any replay already running).
    const unregister =
      store === null ? undefined : registerBeforeSignOut(() => store.flush());
    const stopWatching = store?.subscribe(() => {
      if (active) {
        setSync({
          key,
          error: store.syncError(),
          dropped: store.droppedCount(),
        });
      }
    });
    void session.loaded.then((loaded) => {
      // `active` is false the moment this effect is cleaned up: another learner,
      // sign-out or unmount. A load that finishes late is then thrown away.
      if (active) publish(adopt(rt, session, loaded));
    });

    return () => {
      active = false;
      unregister?.();
      stopWatching?.();
      release(rt, key);
    };
  }, [key, publish, registerBeforeSignOut]);

  // Back online: send what is waiting, and read the account again if it could
  // not be read. No timers: the browser says when the network is back.
  useEffect(() => {
    if (key === null || key === GUEST_KEY) return undefined;
    const onOnline = () => {
      const rt = runtimeRef.current;
      if (rt?.ready?.key !== key) return;
      rt.session?.store?.flush().catch(() => undefined);
      if (!rt.ready.complete) refresh(rt, key, publish);
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [key, publish]);

  const dispatch = useCallback(
    (make: (at: string) => ProgressAction) => {
      const rt = runtimeRef.current;
      if (rt === null) return;
      const action = make(rt.now());
      const ready = rt.ready;
      if (ready === null) {
        rt.queued.push(action);
        return;
      }
      const { next, writes } = applyAction(ready.progress, action);
      if (next !== ready.progress) {
        ready.progress = next;
        publish(ready);
      }
      sendWrites(ready.store, writes);
    },
    [publish],
  );

  const actions = useMemo(
    () => ({
      openLesson: (id: string) => {
        dispatch((at) => ({ type: 'open', id, at }));
      },
      submitQuiz: (id: string, score: number, total: number) => {
        dispatch((at) => ({ type: 'quiz', id, score, total, at }));
      },
      completeLesson: (id: string) => {
        dispatch((at) => ({ type: 'complete', id, at }));
      },
      startLab: (id: string) => {
        dispatch((at) => ({ type: 'startLab', id, at }));
      },
      completeLab: (id: string) => {
        dispatch((at) => ({ type: 'completeLab', id, at }));
      },
    }),
    [dispatch],
  );

  const current = slot !== null && slot.key === key ? slot : null;
  const syncing = sync?.key === key ? sync : null;
  const value = useMemo<ProgressContextValue>(
    () => ({
      state: current?.progress ?? EMPTY,
      ready: current !== null,
      // Either queued writes keep failing, or the account could not be read.
      syncError:
        current !== null && ((syncing?.error ?? false) || !current.complete),
      droppedCount: syncing?.dropped ?? 0,
      ...actions,
    }),
    [current, syncing, actions],
  );

  return <ProgressContext value={value}>{children}</ProgressContext>;
}
