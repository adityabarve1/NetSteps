import { describe, expect, it } from 'vitest';
import { cx } from '@/lib/cx';

describe('cx', () => {
  it('joins the names that are on', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('skips false, undefined and empty names', () => {
    expect(cx('a', false, undefined, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing is on', () => {
    expect(cx(false, undefined)).toBe('');
  });
});
