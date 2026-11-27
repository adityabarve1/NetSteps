// Shared by make-seo.ts and html-site-url.ts (plain Node, relative imports only).
// Trims, drops trailing slashes and checks the value is an http(s) URL, so the
// pages below never get a double slash and a typo fails loudly.
export function cleanSiteUrl(siteUrl: string): string {
  const trimmed = siteUrl.trim().replace(/\/+$/, '');
  let ok = false;
  try {
    const url = new URL(trimmed);
    ok = url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    ok = false;
  }
  if (!ok) {
    throw new RangeError(
      `VITE_SITE_URL must be a full http(s) URL such as https://example.com, got ${JSON.stringify(siteUrl)}`,
    );
  }
  return trimmed;
}
