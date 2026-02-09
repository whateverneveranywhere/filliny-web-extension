import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate } from 'remotion';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { FillinyLogo } from '../components/FillinyLogo';
import { AnimatedText } from '../components/AnimatedText';
import { colors } from '../design/tokens';
import { fontFamily } from '../design/fonts';

// 180 frames = 6 seconds
export const Scene12_CallToAction: React.FC = () => {
  const frame = useCurrentFrame();

  // Glow pulsing effect on the URL — dramatic version
  const glowOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.3, 0.7, 0.3],
    { extrapolateRight: 'clamp' },
  );

  const urlOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const freeOpacity = interpolate(frame, [65, 80], [0, 1], {
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
        gap: 36,
      }}>
      <NoiseDotGrid />

      {/* Logo */}
      <FillinyLogo size={180} delay={5} />

      {/* Tagline */}
      <AnimatedText
        text="Stop Typing. Start Filling."
        fontSize={80}
        fontWeight={800}
        color={colors.white}
        mode="scaleReveal"
        delay={20}
        letterSpacing={2}
      />

      {/* URL with dramatic glow */}
      <div
        style={{
          position: 'relative',
          marginTop: 12,
          opacity: urlOpacity,
        }}>
        {/* Outer glow layer */}
        <div
          style={{
            position: 'absolute',
            inset: -40,
            borderRadius: 30,
            background: `radial-gradient(ellipse, rgba(255,255,255,${glowOpacity * 0.3}) 0%, transparent 70%)`,
          }}
        />
        {/* Inner glow layer */}
        <div
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: 20,
            background: `radial-gradient(ellipse, rgba(255,255,255,${glowOpacity * 0.15}) 0%, transparent 60%)`,
          }}
        />
        <div
          style={{
            fontFamily,
            fontSize: 56,
            fontWeight: 800,
            color: colors.white,
            letterSpacing: 4,
            position: 'relative',
          }}>
          filliny.io
        </div>
      </div>

      {/* Free to start */}
      <div
        style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 8,
          opacity: freeOpacity,
        }}>
        Free to start
      </div>
    </AbsoluteFill>
  );
};
