import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { injectSiteUrl } from './scripts/html-site-url.ts';

// Fills the site URL into index.html (canonical, Open Graph) at build time.
function siteUrlHtml(): Plugin {
  let siteUrl: string | undefined;
  return {
    name: 'netsteps-site-url-html',
    configResolved(config) {
      siteUrl = loadEnv(config.mode, config.envDir, 'VITE_').VITE_SITE_URL;
    },
    transformIndexHtml: (html) => injectSiteUrl(html, siteUrl),
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlHtml()],
  build: {
    rolldownOptions: {
      output: {
        // supabase-js is large and rarely changes: its own long-cached chunk
        // keeps the app entry chunk small.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[/\\]@supabase[/\\]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // Longer than the 8s findBy/waitFor limit in src/test/setup.ts, so a slow
    // lazy route reports its own error instead of a bare timeout.
    testTimeout: 20000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: {
      include: /\.module\.css$/,
      modules: { classNameStrategy: 'non-scoped' },
    },
  },
});
