import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors, radius } from '../design/tokens';
import { SPRING_BOUNCY } from '../design/animations';

interface GlassButtonProps {
  label: string;
  icon?: React.ReactNode;
  delay?: number;
  width?: number;
  height?: number;
  active?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  label,
  icon,
  delay = 0,
  width = 220,
  height = 48,
  active = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(
    spring({ frame: frame - delay, fps, config: SPRING_BOUNCY }),
    [0, 1],
    [0.8, 1],
  );
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius.lg,
        backgroundColor: active ? colors.white : colors.glassBg,
        border: `1px solid ${active ? colors.border : colors.glassBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: active ? colors.foreground : colors.white,
        fontFamily,
        fontSize: 14,
        fontWeight: 600,
        transform: `scale(${scale})`,
        opacity,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}>
      {icon}
      {label}
    </div>
  );
};
