// A stand-in for the account (Supabase) progress store, for tests of the code
// that USES a store. Every method is a spy; load and saveAll can be held or made
// to fail so a test can control timing.
import { vi } from 'vitest';
import { emptyProgress } from '@/progress/logic';
import type { AccountStore } from '@/progress/store';
import type { ProgressState } from '@/progress/types';

interface FakeAccountOptions {
  remote?: ProgressState;
  load?: () => Promise<ProgressState>;
  saveAll?: (state: ProgressState) => Promise<void>;
}

export function createFakeAccountStore(options: FakeAccountOptions = {}) {
  const listeners = new Set<() => void>();
  let syncError = false;
  let dropped = 0;
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  const store = {
    load: vi.fn(() =>
      options.load
        ? options.load()
        : Promise.resolve(options.remote ?? emptyProgress()),
    ),
    saveLesson: vi.fn<AccountStore['saveLesson']>(() => Promise.resolve()),
    recordQuizAttempt: vi.fn<AccountStore['recordQuizAttempt']>(() =>
      Promise.resolve(),
    ),
    saveLab: vi.fn<AccountStore['saveLab']>(() => Promise.resolve()),
    saveAll: vi.fn((state: ProgressState) =>
      options.saveAll ? options.saveAll(state) : Promise.resolve(),
    ),
    flush: vi.fn(() => Promise.resolve()),
    syncError: () => syncError,
    droppedCount: () => dropped,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  } satisfies AccountStore;

  return {
    store,
    setSyncError(value: boolean) {
      syncError = value;
      notify();
    },
    setDropped(count: number) {
      dropped = count;
      notify();
    },
    listenerCount: () => listeners.size,
  };
}

export type FakeAccount = ReturnType<typeof createFakeAccountStore>;
