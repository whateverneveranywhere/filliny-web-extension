import { stripConsolePlugin } from './strip-console-plugin.js';
import env, { IS_DEV, IS_PROD } from '@extension/env';
import { watchRebuildPlugin } from '@extension/hmr';
import react from '@vitejs/plugin-react-swc';
import deepmerge from 'deepmerge';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'node:path';
import type { UserConfig } from 'vite';

const monorepoRoot = resolve(import.meta.dirname, '..', '..', '..');

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export const withPageConfig = (config: UserConfig) =>
  defineConfig(
    deepmerge(
      {
        envDir: monorepoRoot,
        define: {
          'process.env': env,
        },
        base: '',
        plugins: [
          react(),
          IS_DEV && watchRebuildPlugin({ refresh: true }),
          nodePolyfills(),
          IS_PROD && stripConsolePlugin(),
        ],
        build: {
          sourcemap: IS_DEV,
          minify: IS_PROD,
          reportCompressedSize: IS_PROD,
          emptyOutDir: IS_PROD,
          watch: watchOption,
          rollupOptions: {
            external: ['chrome'],
          },
        },
      },
      config,
    ),
  );
