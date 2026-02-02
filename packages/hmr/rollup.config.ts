import * as sucraseModule from '@rollup/plugin-sucrase';
import type { Plugin, RollupOptions } from 'rollup';

// Define minimal options interface
interface SucraseOptions {
  exclude?: string | string[];
  include?: string | string[];
  transforms?: Array<'typescript' | 'jsx' | 'imports' | 'react-hot-loader' | 'jest' | 'flow'>;
}

// Handle ESM/CJS interop with NodeNext module resolution
// sucraseModule.default is the actual function exported by the package
const sucrase = sucraseModule.default as unknown as (options?: SucraseOptions) => Plugin;

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
