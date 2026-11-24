import { describe, expect, it } from 'vitest';
import { mergeAttemptId } from '@/progress/attemptId';

const V4_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('mergeAttemptId', () => {
  it('is the same every time for the same guest score', () => {
    expect(mergeAttemptId('user-1', 'l1-a', 4, 5)).toBe(
      mergeAttemptId('user-1', 'l1-a', 4, 5),
    );
  });

  it('is a plain string (it must be synchronous), shaped like a version 4 uuid', () => {
    const id = mergeAttemptId('user-1', 'l1-a', 4, 5);
    expect(typeof id).toBe('string');
    expect(id).toMatch(V4_SHAPE);
  });

  it('changes when the account, the lesson, the score or the total changes', () => {
    const base = mergeAttemptId('user-1', 'l1-a', 4, 5);
    expect(mergeAttemptId('user-2', 'l1-a', 4, 5)).not.toBe(base);
    expect(mergeAttemptId('user-1', 'l1-b', 4, 5)).not.toBe(base);
    expect(mergeAttemptId('user-1', 'l1-a', 3, 5)).not.toBe(base);
    expect(mergeAttemptId('user-1', 'l1-a', 4, 6)).not.toBe(base);
  });

  it('cannot confuse one field running into the next', () => {
    expect(mergeAttemptId('a|b', 'c', 1, 2)).not.toBe(
      mergeAttemptId('a', 'b|c', 1, 2),
    );
    expect(mergeAttemptId('a', 'b', 12, 3)).not.toBe(
      mergeAttemptId('a', 'b', 1, 23),
    );
    expect(mergeAttemptId('ab', 'c', 1, 2)).not.toBe(
      mergeAttemptId('a', 'bc', 1, 2),
    );
  });

  it('gives a different id to every one of 20,000 different guest scores', () => {
    const seen = new Set<string>();
    for (let lesson = 0; lesson < 2000; lesson += 1) {
      for (let score = 0; score <= 9; score += 1) {
        seen.add(
          mergeAttemptId('user-1', `l1-lesson-${String(lesson)}`, score, 9),
        );
      }
    }
    expect(seen.size).toBe(20_000);
  });

  // These ids are what stops two tabs, or two merges months apart, from adding the
  // same attempt twice. If the algorithm ever changes, an old id and a new one
  // would no longer match and the dedup would silently stop working. Never edit
  // these expected values: change the function so they still hold. They were
  // produced by an independent port of the algorithm, not by this code.
  it('is pinned: the same inputs give the same ids in every release', () => {
    expect(
      mergeAttemptId(
        '00000000-0000-4000-8000-000000000001',
        'l1-what-is-a-network',
        4,
        5,
      ),
    ).toBe('255a1a36-d210-415f-9bfd-f11c44c7d003');
    expect(mergeAttemptId('user-1', 'l1-a', 0, 1)).toBe(
      'c61eb1f7-ae81-46d7-9656-3c8ab73bb4ed',
    );
  });
});
