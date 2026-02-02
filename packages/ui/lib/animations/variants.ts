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
 */
export const durations = {
  fast: 150,
  normal: 200,
  slow: 300,
  verySlow: 500,
} as const;

/**
 * Duration presets in seconds (for framer-motion).
 * Derived from millisecond values for consistency.
 */
export const durationsInSeconds = {
  fast: durations.fast / 1000,
  normal: durations.normal / 1000,
  slow: durations.slow / 1000,
  verySlow: durations.verySlow / 1000,
} as const;

// CSS transition timing function presets
export const easings = {
  easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
  easeIn: 'cubic-bezier(0.32, 0, 0.67, 0)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
} as const;

// Tailwind animation class combinations for common patterns
export const animationClasses = {
  // Fade animations
  fadeIn: 'filliny-animate-in filliny-fade-in filliny-duration-200',
  fadeOut: 'filliny-animate-out filliny-fade-out filliny-duration-200',
  fadeInFast: 'filliny-animate-in filliny-fade-in filliny-duration-150',
  fadeOutFast: 'filliny-animate-out filliny-fade-out filliny-duration-150',
  fadeInSlow: 'filliny-animate-in filliny-fade-in filliny-duration-300',
  fadeOutSlow: 'filliny-animate-out filliny-fade-out filliny-duration-300',

  // Scale animations
  scaleIn: 'filliny-animate-in filliny-zoom-in-95 filliny-duration-200',
  scaleOut: 'filliny-animate-out filliny-zoom-out-95 filliny-duration-200',
  scaleInFade: 'filliny-animate-in filliny-zoom-in-95 filliny-fade-in filliny-duration-200',
  scaleOutFade: 'filliny-animate-out filliny-zoom-out-95 filliny-fade-out filliny-duration-200',

  // Slide animations
  slideInRight: 'filliny-animate-in filliny-slide-in-from-right-4 filliny-fade-in filliny-duration-200',
  slideOutRight: 'filliny-animate-out filliny-slide-out-to-right-4 filliny-fade-out filliny-duration-200',
  slideInLeft: 'filliny-animate-in filliny-slide-in-from-left-4 filliny-fade-in filliny-duration-200',
  slideOutLeft: 'filliny-animate-out filliny-slide-out-to-left-4 filliny-fade-out filliny-duration-200',
  slideInTop: 'filliny-animate-in filliny-slide-in-from-top-2 filliny-fade-in filliny-duration-200',
  slideOutTop: 'filliny-animate-out filliny-slide-out-to-top-2 filliny-fade-out filliny-duration-200',
  slideInBottom: 'filliny-animate-in filliny-slide-in-from-bottom-2 filliny-fade-in filliny-duration-200',
  slideOutBottom: 'filliny-animate-out filliny-slide-out-to-bottom-2 filliny-fade-out filliny-duration-200',

  // Continuous animations
  spin: 'filliny-animate-spin',
  pulse: 'filliny-animate-pulse',
  bounce: 'filliny-animate-bounce',

  // Transition utilities
  transition: 'filliny-transition-all filliny-duration-200 filliny-ease-out',
  transitionFast: 'filliny-transition-all filliny-duration-150 filliny-ease-out',
  transitionSlow: 'filliny-transition-all filliny-duration-300 filliny-ease-out',
  transitionColors: 'filliny-transition-colors filliny-duration-200 filliny-ease-out',
  transitionTransform: 'filliny-transition-transform filliny-duration-200 filliny-ease-out',
  transitionOpacity: 'filliny-transition-opacity filliny-duration-200 filliny-ease-out',
} as const;

// Inline style objects for CSS transitions (when Tailwind classes aren't sufficient)
export const transitionStyles = {
  spring: {
    transitionTimingFunction: easings.spring,
    transitionDuration: `${durations.normal}ms`,
    transitionProperty: 'all',
  },
  bouncy: {
    transitionTimingFunction: easings.bounce,
    transitionDuration: `${durations.normal}ms`,
    transitionProperty: 'all',
  },
  smooth: {
    transitionTimingFunction: easings.easeInOut,
    transitionDuration: `${durations.slow}ms`,
    transitionProperty: 'all',
  },
  quick: {
    transitionTimingFunction: easings.easeOut,
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
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durationsInSeconds.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: durationsInSeconds.fast },
  },
} as const;

/**
 * Slide variants for framer-motion.
 * Use for elements that slide in from a direction.
 */
export const slideVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: durationsInSeconds.normal },
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
 */
export const scaleVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: durationsInSeconds.normal },
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
 */
export const staggerItemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durationsInSeconds.normal },
  },
} as const;

// =============================================================================
// TRANSITION CONFIGURATIONS (for inline framer-motion usage)
// =============================================================================

/**
 * Standard transition configurations for framer-motion.
 * Use with the `transition` prop when not using variants.
 */
export const motionTransitions = {
  fast: {
    duration: durationsInSeconds.fast,
    ease: [0.32, 0.72, 0, 1],
  },
  normal: {
    duration: durationsInSeconds.normal,
    ease: [0.32, 0.72, 0, 1],
  },
  slow: {
    duration: durationsInSeconds.slow,
    ease: [0.32, 0.72, 0, 1],
  },
  spring: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
} as const;
