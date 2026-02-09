import * as sucraseModule from '@rollup/plugin-sucrase';
import type { Plugin, RollupOptions } from 'rollup';

/**
 * Sucrase plugin options subset used in this config.
 * Matches the relevant fields from @rollup/plugin-sucrase's RollupSucraseOptions.
 */
interface SucrasePluginOptions {
  exclude?: string | string[];
  include?: string | string[];
  transforms?: Array<'typescript' | 'jsx' | 'imports' | 'react-hot-loader' | 'jest' | 'flow'>;
}

// Handle ESM/CJS interop with NodeNext module resolution.
// Under NodeNext, `import *` of a CJS default-export package wraps the
// callable in a namespace object. The cast through unknown is required
// because TypeScript cannot reconcile the namespace type with a callable.
const sucrase = sucraseModule.default as unknown as (options?: SucrasePluginOptions) => Plugin;

const plugins: Plugin[] = [
  sucrase({
    exclude: ['node_modules/**'],
    transforms: ['typescript'],
  }),
];

export default [
  {
    plugins,
    input: 'lib/injections/reload.ts',
    output: {
      format: 'esm',
      file: 'dist/lib/injections/reload.js',
    },
  },
  {
    plugins,
    input: 'lib/injections/refresh.ts',
    output: {
      format: 'esm',
      file: 'dist/lib/injections/refresh.js',
    },
  },
] satisfies RollupOptions[];
