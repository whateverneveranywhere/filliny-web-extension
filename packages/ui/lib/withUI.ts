import deepmerge from 'deepmerge';
import type { Config } from 'tailwindcss/types/config';
import { fontFamily } from 'tailwindcss/defaultTheme';
import tailwindAnimate from 'tailwindcss-animate';

export function withUI(tailwindConfig: Config): Config {
  return deepmerge(
    shadcnConfig,
    deepmerge(tailwindConfig, {
      content: ['./node_modules/@extension/ui/lib/**/*.{tsx,ts,js,jsx}'],
    }),
  );
}

const shadcnConfig = {
  darkMode: ['class'],
  prefix: 'filliny-',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--filliny-border))',
        input: 'hsl(var(--filliny-input))',
        ring: 'hsl(var(--filliny-ring))',
        background: 'hsl(var(--filliny-background))',
        foreground: 'hsl(var(--filliny-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--filliny-primary))',
          foreground: 'hsl(var(--filliny-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--filliny-secondary))',
          foreground: 'hsl(var(--filliny-secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--filliny-destructive))',
          foreground: 'hsl(var(--filliny-destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--filliny-muted))',
          foreground: 'hsl(var(--filliny-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--filliny-accent))',
          foreground: 'hsl(var(--filliny-accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--filliny-popover))',
          foreground: 'hsl(var(--filliny-popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--filliny-card))',
          foreground: 'hsl(var(--filliny-card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--filliny-radius)`,
        md: `calc(var(--filliny-radius) - 2px)`,
        sm: 'calc(var(--filliny-radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
};
