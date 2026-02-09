/**
 * Animation constants and utilities for consistent animations across the codebase.
 *
 * Strategy:
 * - Primary: Use Tailwind CSS animations for simple enter/exit animations
 * - Secondary: Use framer-motion only for complex animations (drag, gesture, physics-based)
 *
 * This file provides:
 * 1. Duration constants (shared between Tailwind and framer-motion)
 * 2. Easing functions
 * 3. Tailwind animation class combinations
 * 4. Framer-motion variants for complex animations
 * 5. Inline style objects for CSS transitions
 */

// =============================================================================
// DURATION CONSTANTS
// =============================================================================

/**
 * Animation duration presets in milliseconds.
 * Use these for consistency across CSS transitions and framer-motion.
 *
 * IMPORTANT: These values match the parent project (filliny-app) constants.
 * See: apps/web/src/components/ui/motion.tsx
 */
export const durations = {
  /** 200ms - Fast interactions (hover, tap, micro-animations) */
  fast: 200,
  /** 300ms - Default for most animations */
  default: 300,
  /** 500ms - Slow entrance animations (page transitions, modals) */
  slow: 500,
} as const;

/**
 * Duration presets in seconds (for framer-motion).
 * Derived from millisecond values for consistency.
 *
 * IMPORTANT: These values match the parent project (filliny-app) constants.
 * See: apps/web/src/components/ui/motion.tsx
 */
export const durationsInSeconds = {
  /** 0.2s - Fast interactions (hover, tap, micro-animations) */
  fast: durations.fast / 1000,
  /** 0.3s - Default for most animations */
  default: durations.default / 1000,
  /** 0.5s - Slow entrance animations (page transitions, modals) */
  slow: durations.slow / 1000,
} as const;

/**
 * CSS transition timing function presets.
 *
 * IMPORTANT: The 'out' and 'inOut' values match the parent project (filliny-app) constants.
 * See: apps/web/src/components/ui/motion.tsx
 */
export const easings = {
  /** Standard easeOut for most animations - matches parent project */
  out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** EaseInOut for bidirectional animations - matches parent project */
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
} as const;

/**
 * Tailwind animation class combinations for common patterns.
 *
 * Duration values aligned with parent project (filliny-app):
 * - fast: 200ms (hover, tap, micro-animations)
 * - default: 300ms (most animations)
 * - slow: 500ms (entrance animations, modals)
 */
export const animationClasses = {
  // Fade animations - default duration (300ms)
  fadeIn: 'filliny-animate-in filliny-fade-in filliny-duration-300',
  fadeOut: 'filliny-animate-out filliny-fade-out filliny-duration-300',
  // Fade animations - fast duration (200ms)
  fadeInFast: 'filliny-animate-in filliny-fade-in filliny-duration-200',
  fadeOutFast: 'filliny-animate-out filliny-fade-out filliny-duration-200',
  // Fade animations - slow duration (500ms)
  fadeInSlow: 'filliny-animate-in filliny-fade-in filliny-duration-500',
  fadeOutSlow: 'filliny-animate-out filliny-fade-out filliny-duration-500',

  // Scale animations - default duration (300ms)
  scaleIn: 'filliny-animate-in filliny-zoom-in-95 filliny-duration-300',
  scaleOut: 'filliny-animate-out filliny-zoom-out-95 filliny-duration-300',
  scaleInFade: 'filliny-animate-in filliny-zoom-in-95 filliny-fade-in filliny-duration-300',
  scaleOutFade: 'filliny-animate-out filliny-zoom-out-95 filliny-fade-out filliny-duration-300',

  // Slide animations - default duration (300ms)
  slideInRight: 'filliny-animate-in filliny-slide-in-from-right-4 filliny-fade-in filliny-duration-300',
  slideOutRight: 'filliny-animate-out filliny-slide-out-to-right-4 filliny-fade-out filliny-duration-300',
  slideInLeft: 'filliny-animate-in filliny-slide-in-from-left-4 filliny-fade-in filliny-duration-300',
  slideOutLeft: 'filliny-animate-out filliny-slide-out-to-left-4 filliny-fade-out filliny-duration-300',
  slideInTop: 'filliny-animate-in filliny-slide-in-from-top-2 filliny-fade-in filliny-duration-300',
  slideOutTop: 'filliny-animate-out filliny-slide-out-to-top-2 filliny-fade-out filliny-duration-300',
  slideInBottom: 'filliny-animate-in filliny-slide-in-from-bottom-2 filliny-fade-in filliny-duration-300',
  slideOutBottom: 'filliny-animate-out filliny-slide-out-to-bottom-2 filliny-fade-out filliny-duration-300',

  // Continuous animations
  spin: 'filliny-animate-spin',
  pulse: 'filliny-animate-pulse',
  bounce: 'filliny-animate-bounce',

  // Transition utilities - aligned with parent project durations
  transition: 'filliny-transition-all filliny-duration-300 filliny-ease-out',
  transitionFast: 'filliny-transition-all filliny-duration-200 filliny-ease-out',
  transitionSlow: 'filliny-transition-all filliny-duration-500 filliny-ease-out',
  transitionColors: 'filliny-transition-colors filliny-duration-300 filliny-ease-out',
  transitionTransform: 'filliny-transition-transform filliny-duration-300 filliny-ease-out',
  transitionOpacity: 'filliny-transition-opacity filliny-duration-300 filliny-ease-out',
} as const;

/**
 * Inline style objects for CSS transitions (when Tailwind classes aren't sufficient).
 * Uses the standardized easing curves from parent project.
 */
export const transitionStyles = {
  spring: {
    transitionTimingFunction: easings.spring,
    transitionDuration: `${durations.default}ms`,
    transitionProperty: 'all',
  },
  bouncy: {
    transitionTimingFunction: easings.bounce,
    transitionDuration: `${durations.default}ms`,
    transitionProperty: 'all',
  },
  smooth: {
    transitionTimingFunction: easings.inOut,
    transitionDuration: `${durations.slow}ms`,
    transitionProperty: 'all',
  },
  quick: {
    transitionTimingFunction: easings.out,
    transitionDuration: `${durations.fast}ms`,
    transitionProperty: 'all',
  },
} as const;

// CSS keyframes as strings for dynamic injection (use sparingly)
export const keyframes = {
  slideInFromRight: `
    @keyframes slideInFromRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  slideOutToRight: `
    @keyframes slideOutToRight {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(20px); }
    }
  `,
  fadeScale: `
    @keyframes fadeScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
} as const;

// Helper function to combine animation classes
export const combineAnimations = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

// =============================================================================
// FRAMER-MOTION VARIANTS (for complex animations only)
// =============================================================================

/**
 * Standard fade variants for framer-motion.
 * Use when Tailwind animations are insufficient (e.g., exit animations, gestures).
 * Durations aligned with parent project.
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durationsInSeconds.default },
  },
  exit: {
    opacity: 0,
    transition: { duration: durationsInSeconds.fast },
  },
} as const;

/**
 * Slide variants for framer-motion.
 * Use for elements that slide in from a direction.
 * Durations aligned with parent project.
 */
export const slideVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: durationsInSeconds.default },
  },
  exit: {
    x: 20,
    opacity: 0,
    transition: { duration: durationsInSeconds.fast },
  },
} as const;

/**
 * Scale variants for framer-motion.
 * Use for elements that scale in/out.
 * Durations aligned with parent project.
 */
export const scaleVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: durationsInSeconds.default },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: durationsInSeconds.fast },
  },
} as const;

/**
 * Stagger container variants for framer-motion.
 * Use as parent container when children need staggered animations.
 */
export const staggerContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} as const;

/**
 * Stagger item variants for framer-motion.
 * Use as children within a stagger container.
 * Durations aligned with parent project.
 */
export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durationsInSeconds.default },
  },
} as const;

// =============================================================================
// TRANSITION CONFIGURATIONS (for inline framer-motion usage)
// =============================================================================

/**
 * Standard transition configurations for framer-motion.
 * Use with the `transition` prop when not using variants.
 *
 * IMPORTANT: These values match the parent project (filliny-app) constants.
 * See: apps/web/src/components/ui/motion.tsx
 */
export const motionTransitions = {
  /** 0.2s - Fast interactions (hover, tap) */
  fast: {
    duration: durationsInSeconds.fast,
    ease: [0.25, 0.46, 0.45, 0.94], // matches parent project ANIMATION_EASE.out
  },
  /** 0.3s - Default for most animations */
  default: {
    duration: durationsInSeconds.default,
    ease: [0.25, 0.46, 0.45, 0.94], // matches parent project ANIMATION_EASE.out
  },
  /** 0.5s - Slow entrance animations (page transitions, modals) */
  slow: {
    duration: durationsInSeconds.slow,
    ease: [0.25, 0.46, 0.45, 0.94], // matches parent project ANIMATION_EASE.out
  },
  /** Spring-like easing for playful interactions - matches parent project */
  spring: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  /** Bouncier spring for more playful animations */
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
} as const;
