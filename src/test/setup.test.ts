import { getConfig } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('test setup', () => {
  it('waits long enough for lazily loaded routes on a busy machine', () => {
    expect(getConfig().asyncUtilTimeout).toBeGreaterThanOrEqual(5000);
  });
});
