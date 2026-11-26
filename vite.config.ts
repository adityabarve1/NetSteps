import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
