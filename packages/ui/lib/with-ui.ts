import deepmerge from 'deepmerge';
import type { Config } from 'tailwindcss';

export const withUI = (tailwindConfig: Config): Config =>
  deepmerge(
    {
      prefix: 'filliny-',
      darkMode: 'class',
      content: ['../../packages/ui/lib/**/*.tsx'],
      theme: {
        extend: {
          colors: {
            background: 'oklch(var(--background) / <alpha-value>)',
            foreground: 'oklch(var(--foreground) / <alpha-value>)',
            card: {
              DEFAULT: 'oklch(var(--card) / <alpha-value>)',
              foreground: 'oklch(var(--card-foreground) / <alpha-value>)',
            },
            popover: {
              DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
              foreground: 'oklch(var(--popover-foreground) / <alpha-value>)',
            },
            primary: {
              DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
              foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
            },
            secondary: {
              DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
              foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)',
            },
            muted: {
              DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
              foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
            },
            accent: {
              DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
              foreground: 'oklch(var(--accent-foreground) / <alpha-value>)',
            },
            destructive: {
              DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
              foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)',
            },
            success: {
              DEFAULT: 'oklch(var(--success) / <alpha-value>)',
              foreground: 'oklch(var(--success-foreground) / <alpha-value>)',
            },
            warning: {
              DEFAULT: 'oklch(var(--warning) / <alpha-value>)',
              foreground: 'oklch(var(--warning-foreground) / <alpha-value>)',
            },
            info: {
              DEFAULT: 'oklch(var(--info) / <alpha-value>)',
              foreground: 'oklch(var(--info-foreground) / <alpha-value>)',
            },
            border: 'oklch(var(--border) / <alpha-value>)',
            input: 'oklch(var(--input) / <alpha-value>)',
            ring: 'oklch(var(--ring) / <alpha-value>)',
            chart: {
              '1': 'oklch(var(--chart-1) / <alpha-value>)',
              '2': 'oklch(var(--chart-2) / <alpha-value>)',
              '3': 'oklch(var(--chart-3) / <alpha-value>)',
              '4': 'oklch(var(--chart-4) / <alpha-value>)',
              '5': 'oklch(var(--chart-5) / <alpha-value>)',
            },
            sidebar: {
              DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
              foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
              primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
              'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
              accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
              'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
              border: 'oklch(var(--sidebar-border) / <alpha-value>)',
              ring: 'oklch(var(--sidebar-ring) / <alpha-value>)',
            },
          },
          borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)',
            xl: 'calc(var(--radius) + 4px)',
            '2xl': 'calc(var(--radius) + 8px)',
          },
          keyframes: {
            'accordion-down': {
              from: { height: '0', opacity: '0' },
              to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
            },
            'accordion-up': {
              from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
              to: { height: '0', opacity: '0' },
            },
            'collapsible-down': {
              from: { height: '0', opacity: '0' },
              to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
            },
            'collapsible-up': {
              from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
              to: { height: '0', opacity: '0' },
            },
            'enter': {
              from: {
                opacity: 'var(--filliny-enter-opacity, 1)',
                transform:
                  'translate3d(var(--filliny-enter-translate-x, 0), var(--filliny-enter-translate-y, 0), 0) scale3d(var(--filliny-enter-scale, 1), var(--filliny-enter-scale, 1), var(--filliny-enter-scale, 1)) rotate(var(--filliny-enter-rotate, 0))',
              },
            },
            'exit': {
              to: {
                opacity: 'var(--filliny-exit-opacity, 1)',
                transform:
                  'translate3d(var(--filliny-exit-translate-x, 0), var(--filliny-exit-translate-y, 0), 0) scale3d(var(--filliny-exit-scale, 1), var(--filliny-exit-scale, 1), var(--filliny-exit-scale, 1)) rotate(var(--filliny-exit-rotate, 0))',
              },
            },
          },
          animation: {
            'accordion-down': 'accordion-down 0.2s ease-out forwards',
            'accordion-up': 'accordion-up 0.2s ease-out forwards',
            'collapsible-down': 'collapsible-down 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards',
            'collapsible-up': 'collapsible-up 0.2s cubic-bezier(0.4, 0, 1, 1) forwards',
            'in': 'enter var(--filliny-animate-duration, 150ms) var(--filliny-animate-timing, cubic-bezier(0.4, 0, 0.2, 1))',
            'out': 'exit var(--filliny-animate-duration, 150ms) var(--filliny-animate-timing, cubic-bezier(0.4, 0, 0.2, 1))',
          },
        },
      },
    },
    tailwindConfig,
  );
