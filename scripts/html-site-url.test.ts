// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { injectSiteUrl } from './html-site-url.ts';

const html = `<head>
<link rel="canonical" href="__SITE_URL__/" />
<meta
  property="og:image"
  content="__SITE_URL__/og.png"
/>
<meta property="og:site_name" content="Keep" />
</head>`;

describe('injectSiteUrl', () => {
  it('fills every placeholder and tolerates a trailing slash', () => {
    const out = injectSiteUrl(html, 'https://example.test/');
    expect(out).toContain('href="https://example.test/"');
    expect(out).toContain('content="https://example.test/og.png"');
    expect(out).not.toContain('__SITE_URL__');
  });

  it.each([undefined, '', '   '])(
    'drops the tags that need the URL when it is %j, never shipping the placeholder',
    (missing) => {
      const out = injectSiteUrl(html, missing);
      expect(out).not.toContain('__SITE_URL__');
      expect(out).not.toContain('canonical');
      expect(out).not.toContain('og:image');
      expect(out).toContain('og:site_name');
    },
  );

  it('throws a clear error for a URL that is set but invalid', () => {
    expect(() => injectSiteUrl(html, 'example.test')).toThrow(RangeError);
    expect(() => injectSiteUrl(html, 'example.test')).toThrow(/VITE_SITE_URL/);
  });
});
