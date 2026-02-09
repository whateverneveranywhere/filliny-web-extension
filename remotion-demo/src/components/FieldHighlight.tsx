import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { colors, radius } from '../design/tokens';

interface FieldHighlightProps {
  x: number;
  y: number;
  width: number;
  height: number;
  delay?: number;
  color?: string;
}

export const FieldHighlight: React.FC<FieldHighlightProps> = ({
  x,
  y,
  width,
  height,
  delay = 0,
  color = 'rgba(255,255,255,0.9)',
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 10, delay + 80, delay + 100], [0, 0.95, 0.95, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowSize = interpolate(frame, [delay, delay + 15], [0, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 2,
        top: y - 2,
        width: width + 4,
        height: height + 4,
        borderRadius: radius.md,
        border: `2px solid ${color}`,
        opacity,
        boxShadow: `0 0 ${glowSize}px ${color}`,
        pointerEvents: 'none',
      }}
    />
  );
};
