// Writes public/sitemap.xml and public/robots.txt from the curriculum. Wired as
// `prebuild`. tsx does not resolve "@/", so this file uses relative imports.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { curriculum } from '../src/content/curriculum.ts';
import { cleanSiteUrl } from './site-url.ts';
import type { LevelMeta } from '../src/content/types.ts';

const FIXED_PATHS = ['/', '/learn', '/privacy', '/terms'];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(siteUrl: string, levels: LevelMeta[]): string {
  const base = cleanSiteUrl(siteUrl);
  const lessonPaths = levels.flatMap((level) =>
    level.lessons
      .filter((lesson) => lesson.built)
      .map((lesson) => `/learn/${lesson.levelId}/${lesson.id}`),
  );
  const entries = [...FIXED_PATHS, ...lessonPaths].map(
    // The home page is `base + '/'`; every other path already starts with '/'.
    (path) => `  <url><loc>${escapeXml(base + path)}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export function buildRobots(siteUrl: string): string {
  const base = cleanSiteUrl(siteUrl);
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}

function main(): void {
  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  const sitemap = `${publicDir}sitemap.xml`;
  const robots = `${publicDir}robots.txt`;
  for (const file of ['../.env', '../.env.local']) {
    const path = fileURLToPath(new URL(file, import.meta.url));
    if (existsSync(path)) process.loadEnvFile(path);
  }
  const siteUrl = process.env.VITE_SITE_URL?.trim();
  if (!siteUrl) {
    // Never publish made-up URLs: with no site URL, ship no sitemap at all.
    rmSync(sitemap, { force: true });
    rmSync(robots, { force: true });
    console.warn(
      'make-seo: VITE_SITE_URL is not set, so no sitemap.xml or robots.txt was written.',
    );
    return;
  }
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(sitemap, buildSitemap(siteUrl, curriculum));
  writeFileSync(robots, buildRobots(siteUrl));
  console.log(
    `make-seo: wrote public/sitemap.xml and public/robots.txt for ${siteUrl}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
