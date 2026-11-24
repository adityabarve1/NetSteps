import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUuid } from '@/progress/uuid';

const V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('randomUuid', () => {
  it('makes a version 4 uuid and a different one each time', () => {
    const a = randomUuid();
    expect(a).toMatch(V4);
    expect(randomUuid()).not.toBe(a);
  });

  it('still works on a page without crypto.randomUUID (plain http)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(171);
        return bytes;
      },
    });
    expect(randomUuid()).toMatch(V4);
  });

  it('still works with no crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(randomUuid()).toMatch(V4);
    expect(randomUuid()).not.toBe(randomUuid());
  });
});
