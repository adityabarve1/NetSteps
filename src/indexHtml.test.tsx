import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { siteConfig } from '@/config/site';
import { ThemeProvider } from '@/theme/ThemeProvider';

// index.html cannot import siteConfig, so these tests keep its static text, its
// theme script and its colours in step with the app.
const html = readFileSync('index.html', 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const tokens = readFileSync('src/theme/tokens.css', 'utf8');

function meta(attr: 'name' | 'property', key: string): string | null {
  return (
    doc.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null
  );
}

describe('index.html metadata', () => {
  it('uses the product name from siteConfig', () => {
    expect(doc.title).toContain(siteConfig.name);
    expect(meta('property', 'og:site_name')).toBe(siteConfig.name);
    expect(meta('property', 'og:title')).toContain(siteConfig.name);
    expect(meta('name', 'twitter:title')).toContain(siteConfig.name);
  });

  it('has a description, Open Graph and Twitter card tags', () => {
    expect(meta('name', 'description')?.length).toBeGreaterThan(50);
    expect(meta('property', 'og:description')).toBe(
      meta('name', 'description'),
    );
    expect(meta('property', 'og:type')).toBe('website');
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('builds absolute URLs from the site URL placeholder', () => {
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('__SITE_URL__/');
    expect(meta('property', 'og:url')).toBe('__SITE_URL__/');
    expect(meta('property', 'og:image')).toBe('__SITE_URL__/og.png');
    expect(meta('name', 'twitter:image')).toBe('__SITE_URL__/og.png');
    expect(html).not.toMatch(/%VITE_SITE_URL%/);
  });

  it('links the favicon and theme colours that match the tokens', () => {
    expect(doc.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
      '/favicon.svg',
    );
    const light = doc.querySelector('meta[name="theme-color"][media*="light"]');
    const dark = doc.querySelector('meta[name="theme-color"][media*="dark"]');
    const bg = (selector: string) => {
      const start = tokens.indexOf(selector);
      return /--bg: (#[0-9a-f]{6})/i.exec(tokens.slice(start))?.[1];
    };
    expect(light?.getAttribute('content')).toBe(bg(':root {'));
    expect(dark?.getAttribute('content')).toBe(bg(":root[data-theme='dark']"));
  });
});

describe('inline theme script', () => {
  const script = doc.querySelector('head script:not([src])')?.textContent ?? '';

  function setSystemDark(dark: boolean) {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: dark && query === '(prefers-color-scheme: dark)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  }

  // Runs the page's own script text against the test globals (the browser
  // would run it while parsing). A <script> element would use jsdom's real
  // window, which has no matchMedia for the tests to control.
  function runScript() {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- test only: executes index.html's own inline script
    new Function(script)();
  }

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exists in the head, before the module script', () => {
    expect(script).toContain('netsteps.theme');
    const order =
      html.indexOf('netsteps.theme') < html.indexOf('/src/main.tsx');
    expect(order).toBe(true);
  });

  const stored: (string | null)[] = [
    null,
    'light',
    'dark',
    'system',
    'purple',
    '',
  ];
  it.each(stored.flatMap((s) => [true, false].map((d) => [s, d] as const)))(
    'agrees with ThemeProvider for stored %j and system dark %s',
    (value, systemDark) => {
      setSystemDark(systemDark);
      if (value !== null) window.localStorage.setItem('netsteps.theme', value);

      runScript();
      const fromScript = document.documentElement.dataset.theme;
      document.documentElement.removeAttribute('data-theme');

      render(<ThemeProvider>x</ThemeProvider>);
      expect(fromScript).toBeDefined();
      expect(document.documentElement.dataset.theme).toBe(fromScript);
    },
  );

  it('does not throw when storage is blocked', () => {
    setSystemDark(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(runScript).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.restoreAllMocks();
  });
});
