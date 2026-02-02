'use client';

import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export const ANIMATION_DURATION = {
  fast: 0.2,
  default: 0.3,
  slow: 0.5,
} as const;

export const ANIMATION_EASE = {
  out: [0.25, 0.46, 0.45, 0.94] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
  spring: { type: 'spring', stiffness: 400, damping: 30 } as const,
} as const;

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
  exit: { opacity: 1 },
};

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const fadeInDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface MotionComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

const FadeIn = ({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.slow,
  className,
  ...props
}: MotionComponentProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ margin: '-50px', once: true }}
      variants={prefersReducedMotion ? reducedMotionVariants : fadeInVariants}
      transition={{ duration: prefersReducedMotion ? 0.01 : duration, delay, ease: ANIMATION_EASE.out }}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const FadeInUp = ({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.slow,
  className,
  ...props
}: MotionComponentProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ margin: '-50px', once: true }}
      variants={prefersReducedMotion ? reducedMotionVariants : fadeInUpVariants}
      transition={{ duration: prefersReducedMotion ? 0.01 : duration, delay, ease: ANIMATION_EASE.out }}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const FadeInDown = ({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.slow,
  className,
  ...props
}: MotionComponentProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ margin: '-50px', once: true }}
      variants={prefersReducedMotion ? reducedMotionVariants : fadeInDownVariants}
      transition={{ duration: prefersReducedMotion ? 0.01 : duration, delay, ease: ANIMATION_EASE.out }}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const ScaleIn = ({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.default,
  className,
  ...props
}: MotionComponentProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ margin: '-50px', once: true }}
      variants={prefersReducedMotion ? reducedMotionVariants : scaleInVariants}
      transition={{ duration: prefersReducedMotion ? 0.01 : duration, delay, ease: ANIMATION_EASE.out }}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

const StaggerContainer = ({ children, className, ...props }: StaggerContainerProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ margin: '-50px', once: true }}
      variants={prefersReducedMotion ? reducedMotionVariants : staggerContainerVariants}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, className, ...props }: Omit<MotionComponentProps, 'delay' | 'duration'>) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedMotionVariants : staggerItemVariants}
      transition={{ duration: ANIMATION_DURATION.default, ease: ANIMATION_EASE.out }}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

interface HoverScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

const HoverScale = ({ children, scale = 1.02, className, ...props }: HoverScaleProps) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { scale }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      transition={ANIMATION_EASE.spring}
      className={className}
      {...props}>
      {children}
    </motion.div>
  );
};

const HoverScaleButton = ({ children, className, ...props }: Omit<HoverScaleProps, 'scale'>) => (
  <HoverScale scale={1.05} className={className} {...props}>
    {children}
  </HoverScale>
);

export {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  HoverScaleButton,
  fadeInVariants,
  fadeInUpVariants,
  fadeInDownVariants,
  scaleInVariants,
  staggerContainerVariants,
  staggerItemVariants,
  reducedMotionVariants,
};
