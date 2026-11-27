// Fills the __SITE_URL__ placeholder in index.html at build time. Vite's own
// %VITE_SITE_URL% replacement leaves the literal text behind when the variable
// is missing; this guard never does. With no site URL, the tags that need an
// absolute URL (canonical, og:url, og:image, twitter:image) are dropped.
import { cleanSiteUrl } from './site-url.ts';

const PLACEHOLDER = '__SITE_URL__';

export function injectSiteUrl(
  html: string,
  siteUrl: string | undefined,
): string {
  if (!siteUrl?.trim()) {
    return html.replace(/[ \t]*<[^>]*__SITE_URL__[^>]*>[ \t]*\r?\n?/g, '');
  }
  return html.split(PLACEHOLDER).join(cleanSiteUrl(siteUrl));
}
