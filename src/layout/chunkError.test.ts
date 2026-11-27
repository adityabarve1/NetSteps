import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from '@/layout/chunkError';

describe('isChunkLoadError', () => {
  it.each([
    new TypeError('Failed to fetch dynamically imported module: /a.js'),
    new TypeError('error loading dynamically imported module: /a.js'),
    new TypeError('Importing a module script failed.'),
    new Error('Loading chunk 12 failed.'),
    Object.assign(new Error('x'), { name: 'ChunkLoadError' }),
  ])('recognises %s', (error) => {
    expect(isChunkLoadError(error)).toBe(true);
  });

  it.each([
    new Error('Cannot read properties of undefined'),
    new TypeError('x is not a function'),
    'Failed to fetch dynamically imported module',
    null,
    undefined,
    { message: 'Failed to fetch dynamically imported module' },
    42,
  ])('does not treat %s as a chunk failure', (error) => {
    expect(isChunkLoadError(error)).toBe(false);
  });
});
