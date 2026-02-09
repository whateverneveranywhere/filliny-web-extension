import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { noise3D } from '@remotion/noise';

interface NoiseDotGridProps {
  speed?: number;
  circleRadius?: number;
  maxOffset?: number;
}

const COLS = 20;
const ROWS = 12;
const OVERSCAN = 100;

export const NoiseDotGrid: React.FC<NoiseDotGridProps> = ({
  speed = 0.008,
  circleRadius = 3,
  maxOffset = 25,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const svgWidth = width + OVERSCAN * 2;
  const svgHeight = height + OVERSCAN * 2;

  const dots: React.ReactNode[] = [];

  for (let i = 0; i <= COLS; i++) {
    for (let j = 0; j <= ROWS; j++) {
      const baseX = -OVERSCAN + (svgWidth / COLS) * i;
      const baseY = -OVERSCAN + (svgHeight / ROWS) * j;

      const px = i / COLS;
      const py = j / ROWS;

      const dx = noise3D('x', px, py, frame * speed) * maxOffset;
      const dy = noise3D('y', px, py, frame * speed) * maxOffset;

      const opacity = interpolate(noise3D('opacity', i, j, frame * speed), [-1, 1], [0.05, 0.25]);

      dots.push(
        <circle
          key={`${i}-${j}`}
          cx={baseX + dx}
          cy={baseY + dy}
          r={circleRadius}
          fill="#BFBFBF"
          opacity={opacity}
        />,
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${-OVERSCAN} ${-OVERSCAN} ${svgWidth} ${svgHeight}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}>
      {dots}
    </svg>
  );
};
