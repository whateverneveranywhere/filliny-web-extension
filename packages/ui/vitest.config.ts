import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@extension/shared': path.resolve(__dirname, '../shared/lib/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./lib/__tests__/chrome-mock.ts', './lib/__tests__/setup.ts'],
    include: ['lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'lib/**/*.tsx'],
      exclude: ['lib/**/*.test.ts', 'lib/__tests__/**'],
    },
  },
});
