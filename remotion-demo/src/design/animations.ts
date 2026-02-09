import { interpolate, spring, type SpringConfig } from 'remotion';

type PartialSpringConfig = Partial<SpringConfig>;

// Spring configs (matching codebase motionTransitions)
export const SPRING_SMOOTH: PartialSpringConfig = { stiffness: 400, damping: 30 };
export const SPRING_BOUNCY: PartialSpringConfig = { stiffness: 300, damping: 20 };
export const SPRING_GENTLE: PartialSpringConfig = { damping: 100, mass: 0.5 };

// Duration constants (matching codebase)
export const DURATIONS = {
  fast: 6, // 200ms at 30fps
  default: 9, // 300ms at 30fps
  slow: 15, // 500ms at 30fps
} as const;

// Fade helpers
export const fadeIn = (frame: number, start: number, duration = 20): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const fadeOut = (frame: number, start: number, duration = 20): number =>
  interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// Slide helpers
export const slideUp = (
  frame: number,
  fps: number,
  delay = 0,
  config: PartialSpringConfig = SPRING_SMOOTH,
): number => {
  const s = spring({ frame: frame - delay, fps, config });
  return interpolate(s, [0, 1], [40, 0]);
};

export const slideFromRight = (
  frame: number,
  fps: number,
  delay = 0,
  config: PartialSpringConfig = SPRING_SMOOTH,
): number => {
  const s = spring({ frame: frame - delay, fps, config });
  return interpolate(s, [0, 1], [60, 0]);
};

// Scale helpers
export const scaleIn = (
  frame: number,
  fps: number,
  delay = 0,
  config: PartialSpringConfig = SPRING_BOUNCY,
): number => {
  const s = spring({ frame: frame - delay, fps, config });
  return interpolate(s, [0, 1], [0.5, 1]);
};

export const springValue = (
  frame: number,
  fps: number,
  delay = 0,
  config: PartialSpringConfig = SPRING_SMOOTH,
): number => spring({ frame: frame - delay, fps, config });

// Typewriter effect
export const typewriterText = (
  fullText: string,
  frame: number,
  startFrame: number,
  charsPerFrame = 0.5,
): string => {
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(Math.floor(elapsed * charsPerFrame), fullText.length);
  return fullText.slice(0, charCount);
};

// Stagger delay
export const staggerDelay = (index: number, baseDelay = 8): number => index * baseDelay;

// Counter animation (number counting up)
export const counterValue = (
  frame: number,
  startFrame: number,
  endFrame: number,
  from: number,
  to: number,
): number => {
  const value = interpolate(frame, [startFrame, endFrame], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.round(value);
};

// 3D perspective tilt for browser mockups (Stripe-style)
export const perspectiveTilt = (
  frame: number,
  fps: number,
  delay = 0,
): { rotateY: number; perspective: number } => {
  const s = spring({ frame: frame - delay, fps, config: SPRING_SMOOTH });
  const rotateY = interpolate(s, [0, 1], [-4, 0]);
  return { rotateY, perspective: 1200 };
};
