import { AnimatedText } from '../components/AnimatedText';
import { FillinyLogo } from '../components/FillinyLogo';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { TypewriterText } from '../components/TypewriterText';
import { colors } from '../design/tokens';
import { AbsoluteFill } from 'remotion';
import type React from 'react';

// 180 frames = 6 seconds
export const Scene03_MeetFilliny: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}>
      <NoiseDotGrid />

      {/* Logo — fades in and stays put, no shrinking or moving */}
      <FillinyLogo size={120} delay={5} />

      {/* "Meet Filliny." */}
      <AnimatedText
        text="Meet Filliny."
        fontSize={96}
        fontWeight={800}
        color={colors.white}
        mode="scaleReveal"
        delay={20}
      />

      {/* Typewriter subtitle */}
      <div style={{ marginTop: 12 }}>
        <TypewriterText
          text="AI-powered form filling. One click."
          startFrame={50}
          fontSize={36}
          color={colors.mutedForeground}
          charsPerFrame={0.8}
        />
      </div>
    </AbsoluteFill>
  );
};
