// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { LessonMeta, LevelMeta } from '../src/content/types.ts';
import { curriculum } from '../src/content/curriculum.ts';
import { buildRobots, buildSitemap } from './make-seo.ts';

function lesson(id: string, built: boolean): LessonMeta {
  return {
    id,
    levelId: 'level-1',
    title: id,
    summary: 's',
    minutes: 5,
    built,
    labIds: [],
  };
}

function level(lessons: LessonMeta[]): LevelMeta {
  return { id: 'level-1', number: 1, title: 'Basics', summary: 's', lessons };
}

const levels: LevelMeta[] = [
  level([lesson('l1-built', true), lesson('l1-unbuilt', false)]),
];

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1] ?? '');
}

describe('buildSitemap', () => {
  it('lists the fixed pages and every built lesson, and no unbuilt one', () => {
    const urls = locs(buildSitemap('https://example.test', levels));
    expect(urls).toEqual([
      'https://example.test/',
      'https://example.test/learn',
      'https://example.test/privacy',
      'https://example.test/terms',
      'https://example.test/learn/level-1/l1-built',
    ]);
  });

  it('tolerates trailing slashes and surrounding spaces on the site URL', () => {
    const urls = locs(buildSitemap('  https://example.test///  ', levels));
    expect(urls.every((u) => !u.startsWith('https://example.test//'))).toBe(
      true,
    );
    expect(urls[0]).toBe('https://example.test/');
    expect(urls.join('')).not.toMatch(/[^:]\/\//);
  });

  it('keeps a site URL path prefix', () => {
    const urls = locs(buildSitemap('https://example.test/app/', levels));
    expect(urls[1]).toBe('https://example.test/app/learn');
  });

  it('is well-formed XML with escaped text', () => {
    const xml = buildSitemap('https://example.test', levels);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    const odd = [level([lesson('a&b', true)])];
    expect(buildSitemap('https://example.test', odd)).toContain('a&amp;b');
  });

  it.each(['', '   ', 'not a url', 'ftp://example.test', 'example.test'])(
    'rejects an invalid site URL %j with a clear error',
    (bad) => {
      expect(() => buildSitemap(bad, levels)).toThrow(RangeError);
      expect(() => buildSitemap(bad, levels)).toThrow(/VITE_SITE_URL/);
    },
  );

  it('works on the real curriculum: only built lessons appear', () => {
    const urls = locs(buildSitemap('https://example.test', curriculum));
    const built = curriculum.flatMap((l) => l.lessons).filter((l) => l.built);
    expect(urls).toHaveLength(4 + built.length);
    expect(built.length).toBeGreaterThan(0);
    for (const lesson of built) {
      expect(urls).toContain(
        `https://example.test/learn/${lesson.levelId}/${lesson.id}`,
      );
    }
  });
});

describe('buildRobots', () => {
  it('allows everything and points to the sitemap', () => {
    const robots = buildRobots('https://example.test/');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).not.toMatch(/Disallow: \/\s*$/m);
    expect(
      robots.trimEnd().endsWith('Sitemap: https://example.test/sitemap.xml'),
    ).toBe(true);
  });

  it('rejects an invalid site URL', () => {
    expect(() => buildRobots('')).toThrow(RangeError);
  });
});
