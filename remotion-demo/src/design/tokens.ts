// Filliny Design Tokens — Dark mode OKLCH palette (exact codebase match)
export const colors = {
  // Dark theme base (from global.css .dark)
  background: '#1F1F1F', // oklch(0.12 0 0)
  foreground: '#E6E6E6', // oklch(0.9 0 0)
  card: '#2E2E2E', // oklch(0.18 0 0)
  cardForeground: '#E6E6E6', // oklch(0.9 0 0)
  popover: '#383838', // oklch(0.22 0 0)
  primary: '#EBEBEB', // oklch(0.922 0 0)
  primaryForeground: '#353535', // oklch(0.205 0 0)
  secondary: '#454545', // oklch(0.269 0 0)
  secondaryForeground: '#DEDEDE', // oklch(0.87 0 0)
  muted: '#454545', // oklch(0.269 0 0)
  mutedForeground: '#BFBFBF', // oklch(0.75 0 0)
  accent: '#454545', // oklch(0.269 0 0)
  border: '#4A4A4A', // oklch(0.288 0 0)
  input: '#5A5A5A', // oklch(0.351 0 0)
  ring: '#A6A6A6', // oklch(0.65 0 0)

  // Glass morphism (exact from filliny-button components)
  glassBg: 'rgba(39,39,42,0.9)', // zinc-800/90
  glassBgHover: 'rgba(63,63,70,0.95)', // zinc-700/95
  glassBorder: 'rgba(255,255,255,0.1)', // border-white/10
  glassBorderHover: 'rgba(255,255,255,0.15)', // border-white/15

  // Overlay (from FormsOverlay.tsx)
  overlayIdle: 'rgba(230,230,230,0.3)', // foreground/30
  overlayLoading: 'rgba(230,230,230,0.4)', // foreground/40
  overlayTrack: 'rgba(255,255,255,0.2)', // white/20
  overlayMuted: 'rgba(191,191,191,0.3)', // muted/30
  overlayMutedHover: 'rgba(191,191,191,0.5)', // muted/50

  // Status colors (for progress bar)
  success: '#4ade80', // green-400
  warning: '#fbbf24', // amber-400
  error: '#f87171', // red-400

  // Pure
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10, // base --radius
  xl: 14,
  '2xl': 18,
  full: 9999, // rounded-full (buttons are ALL fully circular)
} as const;

// Exact button sizes from codebase
export const buttonSizes = {
  logoButton: 56, // size-14 (main Filliny button)
  iconButton: 32, // size-8 (vision, drag, test buttons)
  fieldButton: 28, // w-7 h-7 (per-field sparkle button)
  closeButton: 32, // h-8 w-8
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

// Consistent browser mockup size across ALL scenes
export const BROWSER = {
  width: 1200,
  height: 700,
} as const;
