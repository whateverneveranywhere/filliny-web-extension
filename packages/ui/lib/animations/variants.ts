import type { Transition, Variants } from 'framer-motion';

// Spring transitions for different use cases
export const springQuick: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 26,
};

export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 26,
  mass: 0.8,
};

// Common animation variants
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Toggle pill animation variants
export const togglePillVariants = {
  hidden: {
    opacity: 0,
    x: 20,
    width: 0,
    scale: 0.9,
    transition: {
      ...springSmooth,
      duration: 0.25,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    width: 'auto',
    scale: 1,
    transition: {
      ...springBouncy,
      duration: 0.25,
    },
  },
};

// Export type for transition configuration
export type { Transition, Variants };
