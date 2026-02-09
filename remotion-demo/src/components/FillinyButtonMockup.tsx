import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { colors, radius, buttonSizes, spacing } from '../design/tokens';
import { SPRING_BOUNCY, DURATIONS } from '../design/animations';

interface FillinyButtonMockupProps {
  delay?: number;
  showSecondary?: boolean;
  secondaryDelay?: number;
}

// Wand2 icon SVG — 24x24, white stroke (matches lucide Wand2)
const Wand2Icon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
  </svg>
);

// Eye icon SVG — 16x16 (matches lucide Eye)
const EyeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Move icon SVG — 16x16 (matches lucide Move)
const MoveIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
  </svg>
);

export const FillinyButtonMockup: React.FC<FillinyButtonMockupProps> = ({
  delay = 0,
  showSecondary = false,
  secondaryDelay = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main logo button — spring-in with SPRING_BOUNCY
  const mainSpring = spring({
    frame: frame - delay,
    fps,
    config: SPRING_BOUNCY,
  });
  const mainScale = interpolate(mainSpring, [0, 1], [0.3, 1]);
  const mainOpacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Secondary buttons — slide in from right over DURATIONS.slow (15 frames)
  const secStart = delay + secondaryDelay;
  const secProgress = showSecondary
    ? interpolate(frame, [secStart, secStart + DURATIONS.slow], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const secTranslateX = interpolate(secProgress, [0, 1], [16, 0]);
  const secOpacity = secProgress;

  // Shared glass morphism base style
  const glassBase: React.CSSProperties = {
    borderRadius: radius.full,
    backgroundColor: colors.glassBg,
    border: `1px solid ${colors.glassBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}>
      {/* Secondary buttons — LEFT side */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          opacity: secOpacity,
          transform: `translateX(${secTranslateX}px)`,
        }}>
        {/* Eye (vision) button */}
        <div
          style={{
            ...glassBase,
            width: buttonSizes.iconButton,
            height: buttonSizes.iconButton,
            transform: showSecondary && secProgress >= 1 ? 'scale(1.25)' : 'scale(1)',
          }}>
          <EyeIcon size={16} />
        </div>

        {/* Move (drag) button */}
        <div
          style={{
            ...glassBase,
            width: buttonSizes.iconButton,
            height: buttonSizes.iconButton,
            transform: showSecondary && secProgress >= 1 ? 'scale(1.25)' : 'scale(1)',
          }}>
          <MoveIcon size={16} />
        </div>
      </div>

      {/* Main logo button — RIGHT side */}
      <div
        style={{
          ...glassBase,
          width: buttonSizes.logoButton,
          height: buttonSizes.logoButton,
          transform: `scale(${mainScale})`,
          opacity: mainOpacity,
        }}>
        <Wand2Icon size={24} />
      </div>
    </div>
  );
};
