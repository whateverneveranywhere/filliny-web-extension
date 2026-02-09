import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { colors, radius } from '../design/tokens';

interface ProgressBarProps {
  startFrame?: number;
  endFrame?: number;
  width?: number;
  height?: number;
  barColor?: string;
  trackColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  startFrame = 0,
  endFrame = 100,
  width = 280,
  height = 8,
  barColor = colors.white,
  trackColor = 'rgba(255,255,255,0.15)',
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, endFrame], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius.full,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}>
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: barColor,
        }}
      />
    </div>
  );
};
