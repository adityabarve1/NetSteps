// The real provider with the real Supabase store, over the fake database: checks
// the pieces are wired together (the unit tests cover each piece on its own).
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, GUEST_STORAGE_KEY } from '@/progress/localStore';
import { createSupabaseStore, pendingKey } from '@/progress/supabaseStore';
import { createFakeDb } from '@/test/fakeDb';
import { pendingKeys } from '@/test/pendingStorage';
import { done, stateOf, T1, withQuiz } from '@/test/progressFixtures';
import {
  authSignedIn,
  authSignedOut,
  renderProgress,
} from '@/test/renderProgress';

const ready = (result: { current: { ready: boolean } }) =>
  waitFor(() => {
    expect(result.current.ready).toBe(true);
  });
const guestKeyGone = () =>
  waitFor(() => {
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
  });

function setup(userId = 'alice') {
  const db = createFakeDb({ userId });
  const view = renderProgress(authSignedOut, {
    realAccount: (id) => createSupabaseStore(db.client, id),
  });
  return { db, view };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('offline writes through the real store (RF3)', () => {
  it('shows syncError while a write is queued and clears it on the online event', async () => {
    const { db, view } = setup();
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    db.setOffline(true);
    act(() => {
      view.result.current.openLesson('l1-a');
      view.result.current.completeLesson('l1-a');
    });
    await waitFor(() => {
      expect(view.result.current.syncError).toBe(true);
    });
    expect(view.result.current.state.lessons['l1-a']?.status).toBe('completed');
    expect(pendingKeys(pendingKey('alice'))).not.toEqual([]);

    db.setOffline(false);
    view.online();

    await waitFor(() => {
      expect(view.result.current.syncError).toBe(false);
    });
    expect(db.table('lesson_progress')).toHaveLength(1);
    expect(db.table('lesson_progress')[0]).toMatchObject({
      lesson_id: 'l1-a',
      status: 'completed',
    });
    expect(pendingKeys(pendingKey('alice'))).toEqual([]);
  });

  it('a quiz submit made offline is saved once, however often it is retried', async () => {
    const { db, view } = setup();
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    db.setOffline(true);
    act(() => {
      view.result.current.submitQuiz('l1-a', 4, 5);
    });
    await waitFor(() => {
      expect(view.result.current.syncError).toBe(true);
    });

    db.setOffline(false);
    view.online();
    view.online();
    await waitFor(() => {
      expect(view.result.current.syncError).toBe(false);
    });

    expect(db.table('quiz_attempts')).toHaveLength(1);
  });

  it('shows, and then sends, what was saved offline in an earlier visit', async () => {
    const first = setup();
    first.view.setAuth(authSignedIn('alice'));
    await ready(first.view.result);
    first.db.setOffline(true);
    act(() => {
      first.view.result.current.completeLesson('l1-a');
    });
    first.view.unmount();

    // A new visit: the database is back, the queue is still in localStorage.
    const second = setup();
    second.view.setAuth(authSignedIn('alice'));
    await ready(second.view.result);

    expect(second.view.result.current.state.lessons['l1-a']?.status).toBe(
      'completed',
    );
    await waitFor(() => {
      expect(second.db.table('lesson_progress')).toHaveLength(1);
    });
  });
});

describe('guest to account through the real store (RF5)', () => {
  it('saves lessons, labs and the quiz score once, then clears the guest key', async () => {
    await createLocalStore().saveAll({
      lessons: { 'l1-a': withQuiz(done(T1), 4, 5) },
      labs: { 'lab-a': { status: 'completed', completedAt: T1 } },
    });
    const { db, view } = setup();
    await ready(view.result);

    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    await guestKeyGone();

    expect(db.table('lesson_progress')).toHaveLength(1);
    expect(db.table('lab_progress')).toHaveLength(1);
    expect(db.table('quiz_attempts')).toHaveLength(1);
    expect(view.result.current.state.lessons['l1-a']?.quizBest).toEqual({
      score: 4,
      total: 5,
    });
  });

  it('merging the same guest progress again (the delete never happened) adds no second attempt', async () => {
    const guest = stateOf({ 'l1-a': withQuiz(done(T1), 4, 5) });
    await createLocalStore().saveAll(guest);
    const { db, view } = setup();
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    await guestKeyGone();

    // The guest copy comes back, and the learner signs out and in again.
    await createLocalStore().saveAll(guest);
    view.setAuth(authSignedOut);
    await ready(view.result);
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    await guestKeyGone();

    expect(db.table('quiz_attempts')).toHaveLength(1);
    expect(db.table('lesson_progress')).toHaveLength(1);
  });

  it('keeps the guest progress when the merge can neither be sent nor kept', async () => {
    await createLocalStore().saveAll(stateOf({ 'l1-a': done(T1) }));
    const { db, view } = setup();
    db.setOffline(true);
    const full = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    try {
      view.setAuth(authSignedIn('alice'));
      await ready(view.result);
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      full.mockRestore();
    }
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).not.toBeNull();
    expect(view.result.current.state.lessons['l1-a']).toBeDefined();
  });
});

describe('two accounts on one browser (RF5)', () => {
  it('never sends one account waiting writes with the other account signed in, nor shows them', async () => {
    const { db, view } = setup('alice');
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    db.setOffline(true);
    act(() => {
      view.result.current.completeLesson('l1-alices');
    });
    await waitFor(() => {
      expect(view.result.current.syncError).toBe(true);
    });

    // Alice signs out; the network comes back; Bob signs in on the same browser.
    view.setAuth(authSignedOut);
    await ready(view.result);
    db.calls.length = 0; // only what is sent from here on matters
    db.setOffline(false);
    db.setSignedInAs('bob');
    view.setAuth(authSignedIn('bob'));
    await ready(view.result);
    view.online();
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.result.current.state.lessons).toEqual({});
    expect(db.table('lesson_progress')).toHaveLength(0);
    expect(db.writes()).toHaveLength(0);
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? '').not.toContain(
      'l1-alices',
    );
    // Alice's waiting write is still hers, under her own key, for her return.
    expect(pendingKeys(pendingKey('alice'))).toHaveLength(1);
    expect(pendingKeys(pendingKey('bob'))).toEqual([]);
  });

  it('delivers Alice waiting write when Alice comes back', async () => {
    const { db, view } = setup('alice');
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);
    db.setOffline(true);
    act(() => {
      view.result.current.completeLesson('l1-alices');
    });
    view.setAuth(authSignedOut);
    await ready(view.result);

    db.setOffline(false);
    view.setAuth(authSignedIn('alice'));
    await ready(view.result);

    await waitFor(() => {
      expect(db.table('lesson_progress')).toHaveLength(1);
    });
    expect(view.result.current.state.lessons['l1-alices']?.status).toBe(
      'completed',
    );
  });
});
