import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { SPRING_SMOOTH } from '../design/animations';

interface CursorPointerProps {
  x: number;
  y: number;
  delay?: number;
  clickAt?: number;
}

export const CursorPointer: React.FC<CursorPointerProps> = ({ x, y, delay = 0, clickAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: SPRING_SMOOTH });
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const posX = interpolate(progress, [0, 1], [x - 100, x]);
  const posY = interpolate(progress, [0, 1], [y + 60, y]);

  const isClicking = clickAt !== undefined && frame >= clickAt && frame < clickAt + 6;
  const scale = isClicking ? 0.85 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: posX,
        top: posY,
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
        zIndex: 100,
      }}>
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.2 0L5.2 24.4L10.3 19.5L14.6 28.7L18.5 27L14.2 17.8L21.2 17.8L5.2 0Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};
