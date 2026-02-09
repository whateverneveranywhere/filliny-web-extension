import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors } from '../design/tokens';
import { counterValue } from '../design/animations';

interface CounterAnimationProps {
  from?: number;
  to: number;
  startFrame?: number;
  endFrame?: number;
  suffix?: string;
  prefix?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

export const CounterAnimation: React.FC<CounterAnimationProps> = ({
  from = 0,
  to,
  startFrame = 0,
  endFrame = 60,
  suffix = '',
  prefix = '',
  fontSize: size = 96,
  fontWeight = 700,
  color = colors.foreground,
}) => {
  const frame = useCurrentFrame();
  const value = counterValue(frame, startFrame, endFrame, from, to);

  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}>
      {prefix}
      {value}
      {suffix}
    </div>
  );
};
