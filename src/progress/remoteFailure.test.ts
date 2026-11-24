import { describe, expect, it } from 'vitest';
import { classifyFailure, RemoteFailure } from '@/progress/remoteFailure';

const failure = (status: number, code = '', message = 'm') =>
  new RemoteFailure(message, status, code);

describe('classifyFailure: what keeps an operation and what drops it', () => {
  it.each([
    ['a network error thrown by fetch', new TypeError('Failed to fetch')],
    ['an unknown thrown value', 'boom'],
    ['an undefined throw', undefined],
    ['status 0 (offline, aborted, timed out)', failure(0, '', 'FetchError: x')],
    ['HTTP 500', failure(500)],
    ['HTTP 502', failure(502)],
    ['HTTP 503 (schema cache loading)', failure(503, 'PGRST002')],
    ['HTTP 504', failure(504)],
    ['HTTP 429 (rate limited)', failure(429)],
    ['HTTP 408 (request timeout)', failure(408)],
    ['an expired JWT (401, PGRST301)', failure(401, 'PGRST301', 'JWT expired')],
    [
      'an expired JWT (403 with a JWT message)',
      failure(403, '', 'JWT expired'),
    ],
    ['an invalid token (401)', failure(401, '', 'Invalid token')],
    [
      'a missing table in the schema cache (404, PGRST205)',
      failure(404, 'PGRST205'),
    ],
    [
      'a missing column (400, PGRST204): a setup problem, not a bad row',
      failure(400, 'PGRST204'),
    ],
    ['an undefined table (42P01)', failure(404, '42P01')],
    ['a serialization failure (40001)', failure(409, '40001')],
    ['a deadlock (40P01)', failure(409, '40P01')],
    ['a connection exception (08006)', failure(500, '08006')],
    ['too many connections (53300)', failure(500, '53300')],
    ['an error nobody told us about', failure(418, 'WEIRD')],
  ])('keeps the operation for %s', (_name, error) => {
    expect(classifyFailure(error)).toBe('retry');
  });

  it.each([
    ['a unique violation (23505)', failure(409, '23505')],
    ['a check violation (23514)', failure(400, '23514')],
    ['a foreign key violation (23503)', failure(409, '23503')],
    ['a not-null violation (23502)', failure(400, '23502')],
    ['a bad text value for a uuid (22P02)', failure(400, '22P02')],
    ['a number out of range (22003)', failure(400, '22003')],
    ['a row level security violation (42501)', failure(403, '42501')],
    ['a plain 400', failure(400)],
    ['a plain 409', failure(409)],
    ['a plain 422', failure(422)],
    ['a body that is too large (413)', failure(413)],
    ['a raised exception (P0001)', failure(400, 'P0001')],
  ])('drops the operation for %s', (_name, error) => {
    expect(classifyFailure(error)).toBe('drop');
  });

  // The code alone decides, whatever status came with it.
  it.each([
    ['a unique violation', '23505'],
    ['a check violation', '23514'],
    ['a bad uuid', '22P02'],
    ['a policy violation', '42501'],
  ])('drops %s (%s) by its code even with an unusual status', (_name, code) => {
    expect(classifyFailure(failure(418, code))).toBe('drop');
  });

  it('lets an auth code win over a status that would otherwise drop', () => {
    expect(classifyFailure(failure(400, 'PGRST303', 'JWT expired'))).toBe(
      'retry',
    );
  });
});

describe('RemoteFailure', () => {
  it('carries the status and code', () => {
    const error = new RemoteFailure('nope', 409, '23505');
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.code).toBe('23505');
    expect(error.message).toBe('nope');
  });
});
