import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      zIndex: {
        'filliny-dropdown': '99999',
        'filliny-overlay': '999999',
        'filliny-max': '9999999',
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>;
