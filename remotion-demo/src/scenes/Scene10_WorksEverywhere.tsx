import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { AnimatedText } from '../components/AnimatedText';
import { colors, radius } from '../design/tokens';
import { fontFamily } from '../design/fonts';
import { SPRING_BOUNCY, staggerDelay } from '../design/animations';

// 150 frames = 5 seconds
export const Scene10_WorksEverywhere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const websites = [
    { name: 'LinkedIn', fields: 12 },
    { name: 'Google Forms', fields: 8 },
    { name: 'Shopify', fields: 6 },
    { name: 'Typeform', fields: 10 },
    { name: 'HubSpot', fields: 14 },
    { name: 'Salesforce', fields: 18 },
  ];

  const statOpacity = interpolate(frame, [85, 100], [0, 1], {
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
        gap: 40,
      }}>
      <NoiseDotGrid />

      <AnimatedText
        text="Works on any website."
        fontSize={72}
        fontWeight={800}
        color={colors.white}
        mode="scaleReveal"
        delay={5}
      />

      {/* Website cards montage */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'center',
          maxWidth: 1400,
        }}>
        {websites.map((site, i) => {
          const d = 15 + staggerDelay(i, 10);
          const s = spring({ frame: frame - d, fps, config: SPRING_BOUNCY });
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          const opacity = interpolate(frame, [d, d + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={site.name}
              style={{
                width: 200,
                height: 110,
                flexShrink: 0,
                borderRadius: radius.xl,
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transform: `scale(${scale})`,
                opacity,
              }}>
              <div
                style={{
                  fontFamily,
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.white,
                }}>
                {site.name}
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                {site.fields} fields
              </div>
            </div>
          );
        })}
      </div>

      {/* Field types count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: statOpacity,
        }}>
        <div
          style={{
            fontFamily,
            fontSize: 64,
            fontWeight: 800,
            color: colors.white,
          }}>
          20+
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
          }}>
          field types supported
        </div>
      </div>
    </AbsoluteFill>
  );
};
