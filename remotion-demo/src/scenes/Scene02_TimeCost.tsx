import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { CounterAnimation } from '../components/CounterAnimation';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { colors } from '../design/tokens';

// 150 frames = 5 seconds
export const Scene02_TimeCost: React.FC = () => {
  const frame = useCurrentFrame();

  // Horizontal divider line animation
  const lineWidth = interpolate(frame, [20, 80], [0, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
      <NoiseDotGrid />

      {/* Counter: 0 -> 10 */}
      <CounterAnimation
        from={0}
        to={10}
        startFrame={10}
        endFrame={80}
        fontSize={120}
        fontWeight={700}
        color={colors.white}
        suffix="+"
      />

      {/* "hours per week" */}
      <AnimatedText
        text="hours per week"
        fontSize={44}
        fontWeight={500}
        color="rgba(255,255,255,0.7)"
        delay={30}
        mode="fadeSlide"
      />

      {/* Divider line */}
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.15)',
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Secondary text */}
      <AnimatedText
        text="wasted on repetitive form filling"
        fontSize={32}
        fontWeight={400}
        color="rgba(255,255,255,0.5)"
        delay={60}
        mode="fade"
      />
    </AbsoluteFill>
  );
};
