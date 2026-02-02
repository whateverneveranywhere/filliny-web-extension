import deepmerge from 'deepmerge';
import type { Config } from 'tailwindcss';

export const withUI = (tailwindConfig: Config): Config =>
  deepmerge(
    {
      prefix: 'filliny-',
      darkMode: 'class',
      content: ['../../packages/ui/lib/**/*.tsx'],
    },
    tailwindConfig,
  );
