import React from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { colors } from '../design/tokens';
import { fontFamily } from '../design/fonts';
import { fadeIn, staggerDelay } from '../design/animations';

// 210 frames = 7 seconds
export const Scene01_Problem: React.FC = () => {
  const frame = useCurrentFrame();

  const formTypes = ['Job applications.', 'Registrations.', 'Checkouts.'];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <NoiseDotGrid />

      {/* Main headlines */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}>
        <AnimatedText
          text="You fill the same forms."
          fontSize={96}
          fontWeight={800}
          color={colors.white}
          mode="scaleReveal"
          delay={10}
        />

        <AnimatedText
          text="Over and over."
          fontSize={96}
          fontWeight={800}
          color={colors.white}
          mode="scaleReveal"
          delay={35}
        />
      </div>

      {/* Form types */}
      <div
        style={{
          marginTop: 48,
          display: 'flex',
          gap: 24,
        }}>
        {formTypes.map((text, i) => (
          <div
            key={text}
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              opacity: fadeIn(frame, 70 + staggerDelay(i, 20)),
            }}>
            {text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
