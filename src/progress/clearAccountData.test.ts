import { afterEach, describe, expect, it } from 'vitest';
import { clearAccountData } from '@/progress/clearAccountData';

afterEach(() => {
  localStorage.clear();
});

describe('clearAccountData', () => {
  it('removes every queued write of that account and nothing else', () => {
    localStorage.setItem('netsteps.pending.u1.000-a', '{}');
    localStorage.setItem('netsteps.pending.u1.000-b', '{}');
    localStorage.setItem('netsteps.pending.u2.000-a', '{}');
    localStorage.setItem('netsteps.pending.u10.000-a', '{}');
    localStorage.setItem('netsteps.progress.guest.v1', '{}');
    localStorage.setItem('netsteps.theme', 'dark');

    clearAccountData('u1');

    expect(Object.keys(localStorage).sort()).toEqual([
      'netsteps.pending.u10.000-a',
      'netsteps.pending.u2.000-a',
      'netsteps.progress.guest.v1',
      'netsteps.theme',
    ]);
  });

  it('does nothing for an empty or odd id', () => {
    localStorage.setItem('netsteps.pending.u1.000-a', '{}');

    clearAccountData('');
    clearAccountData('u1.');

    expect(localStorage.getItem('netsteps.pending.u1.000-a')).toBe('{}');
  });

  it('does not throw when storage is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    try {
      expect(() => {
        clearAccountData('u1');
      }).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
