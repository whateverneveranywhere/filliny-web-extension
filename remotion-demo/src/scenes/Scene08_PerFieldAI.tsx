import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { AnimatedText } from '../components/AnimatedText';
import { BrowserMockup } from '../components/BrowserMockup';
import { CursorPointer } from '../components/CursorPointer';
import { FormMockup } from '../components/FormMockup';
import { SPRING_BOUNCY, staggerDelay } from '../design/animations';
import { fontFamily } from '../design/fonts';
import { colors, radius, BROWSER, buttonSizes } from '../design/tokens';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, spring, interpolate } from 'remotion';
import type { FormField } from '../components/FormMockup';
import type React from 'react';

// 180 frames = 6 seconds
export const Scene08_PerFieldAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const formFields: FormField[] = [
    { label: 'Full Name', type: 'text', value: 'John Doe', fillDelay: 100 },
    {
      label: 'Bio',
      type: 'textarea',
      placeholder: 'Write a short bio...',
      value: 'Passionate developer with 5+ years of experience in building web applications.',
    },
    { label: 'Skills', type: 'text', placeholder: 'e.g. React, TypeScript' },
    { label: 'Available', type: 'checkbox', placeholder: 'Available for remote work' },
  ];

  // Sparkle buttons positioned ABOVE the top-right corner of each field input.
  // The form is centered (maxWidth: 600, margin: 0 auto) inside a container
  // with padding: 10px 50px (relative positioned div, 1200px wide).
  //
  // Layout calculation (compact mode: fieldHeight=36, gap=10):
  //   Container div: 1200px wide, 50px side padding => 1100px inner
  //   Form (600px) centered: left edge = 50 + (1100-600)/2 = 300px
  //   Form padding: 24px => field inputs end at 300 + 600 - 24 = 876px
  //   Sparkle button (28px) center-aligned with field right edge:
  //     X = 876 - 14 (half button) = 862px
  //
  //   Vertical (from div top):
  //     10(div pad) + 24(form pad) + ~24(title) + 8(mb) = 66px to first label
  //     Label: ~16px + 4px gap before input
  //
  //   Field 0 "Full Name" (text):     input top = 66+16+4 = 86.  Sparkle Y = 86-28 = 58
  //   Field 1 "Bio" (textarea h=72):  input top = 86+36+10+16+4 = 152.  Sparkle Y = 152-28 = 124
  //   Field 2 "Skills" (text):        input top = 152+72+10+16+4 = 254.  Sparkle Y = 254-28 = 226
  //   Field 3 "Available" (checkbox): input top = 254+36+10+16+4 = 320.  Sparkle Y = 320-28 = 292
  const sparkleX = 862;
  const sparklePositions = [
    { x: sparkleX, y: 58 },
    { x: sparkleX, y: 124 },
    { x: sparkleX, y: 226 },
    { x: sparkleX, y: 292 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        gap: 20,
      }}>
      <NoiseDotGrid />

      <AnimatedText text="Or fill one field at a time." fontSize={48} fontWeight={700} color={colors.white} delay={5} mode="scaleReveal" />

      <div style={{ position: 'relative' }}>
        <BrowserMockup delay={10} width={BROWSER.width} height={BROWSER.height - 40} url="https://example.com/profile">
          <div style={{ padding: '10px 50px', position: 'relative' }}>
            <FormMockup
              fields={formFields}
              title="Edit Profile"
              compact
              showValues={frame > 100}
              fillStartFrame={100}
            />

            {/* Sparkle/AI buttons at top-right of each field */}
            {sparklePositions.map((pos, i) => {
              const d = 30 + staggerDelay(i, 12);
              const sparkleScale = interpolate(
                spring({ frame: frame - d, fps, config: SPRING_BOUNCY }),
                [0, 1],
                [0, 1],
              );
              const sparkleOpacity = interpolate(frame, [d, d + 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: buttonSizes.fieldButton,
                    height: buttonSizes.fieldButton,
                    borderRadius: radius.full,
                    backgroundColor: colors.glassBg,
                    border: `1px solid ${colors.glassBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${sparkleScale})`,
                    opacity: sparkleOpacity,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
                  </svg>
                </div>
              );
            })}
          </div>
        </BrowserMockup>

        {/* Cursor clicking first sparkle button */}
        <CursorPointer
          x={sparklePositions[0].x + buttonSizes.fieldButton + 16}
          y={sparklePositions[0].y + buttonSizes.fieldButton / 2 + 10}
          delay={60}
          clickAt={95}
        />
      </div>

      {/* Filled value indicator */}
      {frame > 115 && (
        <div
          style={{
            fontFamily,
            fontSize: 28,
            color: colors.mutedForeground,
            opacity: interpolate(frame, [115, 130], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}>
          AI fills just the field you need
        </div>
      )}
    </AbsoluteFill>
  );
};
