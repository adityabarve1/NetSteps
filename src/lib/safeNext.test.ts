import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safeNext';

describe('safeNextPath', () => {
  it.each([
    '/learn',
    '/learn/level-1',
    '/learn/level-1/l1-what-is-a-network',
    '/profile',
    '/learn?tab=labs',
    '/learn#quiz',
    '/learn/level-1?x=1&y=2#top',
    '/',
  ])('keeps the same-site path %j', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('falls back to /learn for %s', (_name, raw) => {
    expect(safeNextPath(raw)).toBe('/learn');
  });

  it.each([
    ['a protocol-relative URL', '//evil.com'],
    ['a protocol-relative URL with a path', '//evil.com/learn'],
    ['an https URL', 'https://evil.com'],
    ['an http URL', 'http://evil.com/learn'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an upper-case javascript: URL', 'JAVASCRIPT:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a backslash after the slash', '/\\evil.com'],
    ['a leading backslash', '\\evil.com'],
    ['two leading backslashes', '\\\\evil.com'],
    ['a relative path', 'learn'],
    ['a dot-relative path', './learn'],
    ['a parent-relative path', '../learn'],
    ['a bare host', 'evil.com'],
    ['a leading space then a slash', ' /learn'],
    ['a trailing space', '/learn '],
    ['a space inside', '/learn evil'],
  ])('falls back to /learn for %s', (_name, raw) => {
    expect(safeNextPath(raw)).toBe('/learn');
  });

  it.each([
    ['a tab after the slash', '/\t/evil.com'],
    ['a newline after the slash', '/\n/evil.com'],
    ['a carriage return after the slash', '/\r/evil.com'],
    ['a tab inside', '/learn\tevil'],
    ['a newline inside', '/learn\nevil'],
    ['a NUL byte', '/learn\u0000'],
    ['a DEL character', '/learn\u007f'],
    ['a C1 control character', '/learn\u0085'],
    ['a non-breaking space', '/ /evil.com'],
    ['a line separator', '/learn '],
    ['a zero-width space', '/​/evil.com'],
    ['a byte order mark', '/﻿/evil.com'],
    ['a backslash later in the path', '/learn\\evil'],
  ])('falls back to /learn for %s', (_name, raw) => {
    expect(safeNextPath(raw)).toBe('/learn');
  });

  it.each([
    ['encoded slashes after the slash', '/%2f%2fevil.com'],
    ['an encoded slash then a slash', '/%2f/evil.com'],
    ['a slash then an encoded slash', '//%2fevil.com'],
    ['an encoded backslash after the slash', '/%5cevil.com'],
    ['an upper-case encoded backslash', '/%5Cevil.com'],
  ])('refuses an encoded variant of a host start: %s', (_name, raw) => {
    // The router never decodes the path before it reaches the history API, so
    // these could not become a host. They are refused anyway: a lesson link
    // never needs one, and it keeps the rule easy to reason about.
    expect(safeNextPath(raw)).toBe('/learn');
  });

  it('keeps a double-encoded start, which decodes once to a plain path', () => {
    expect(safeNextPath('/%252f%252fevil.com')).toBe('/%252f%252fevil.com');
  });

  it('falls back for a malformed percent escape, which the router cannot decode', () => {
    expect(safeNextPath('/learn/%zz')).toBe('/learn');
    expect(safeNextPath('/%')).toBe('/learn');
    expect(safeNextPath('/learn/%E0%A4%A')).toBe('/learn');
  });

  it('accepts a normal encoded character inside the path', () => {
    expect(safeNextPath('/learn/level-1?q=a%20b')).toBe(
      '/learn/level-1?q=a%20b',
    );
  });

  it('falls back for very long input and keeps the limit boundary', () => {
    const atLimit = `/${'a'.repeat(2047)}`;
    expect(atLimit).toHaveLength(2048);
    expect(safeNextPath(atLimit)).toBe(atLimit);
    expect(safeNextPath(`${atLimit}a`)).toBe('/learn');
    expect(safeNextPath(`/${'a'.repeat(100_000)}`)).toBe('/learn');
  });

  it('never throws on odd input', () => {
    for (const raw of ['%', '/%', '\ud800', '/\ud800', '/'.repeat(5000)]) {
      expect(() => safeNextPath(raw)).not.toThrow();
    }
  });
});
