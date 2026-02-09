import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors, radius, spacing } from '../design/tokens';
import { SPRING_SMOOTH } from '../design/animations';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: SPRING_SMOOTH });
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const translateY = interpolate(s, [0, 1], [20, 0]);
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        padding: spacing.lg,
        borderRadius: radius.xl,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.white,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        width: 260,
      }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontFamily, fontSize: 16, fontWeight: 700, color: colors.foreground }}>{title}</div>
      <div style={{ fontFamily, fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>{description}</div>
    </div>
  );
};
