import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate } from 'remotion';
import { BrowserMockup } from '../components/BrowserMockup';
import { FormMockup, type FormField } from '../components/FormMockup';
import { FieldHighlight } from '../components/FieldHighlight';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { CounterAnimation } from '../components/CounterAnimation';
import { CursorPointer } from '../components/CursorPointer';
import { AnimatedText } from '../components/AnimatedText';
import { colors, BROWSER } from '../design/tokens';
import { fontFamily } from '../design/fonts';

// 180 frames = 6 seconds
export const Scene05_VisionMode: React.FC = () => {
  const frame = useCurrentFrame();

  const formFields: FormField[] = [
    { label: 'First Name', placeholder: 'John', type: 'text' },
    { label: 'Last Name', placeholder: 'Doe', type: 'text' },
    { label: 'Email Address', placeholder: 'john@example.com', type: 'email' },
    { label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'text' },
    { label: 'Company', placeholder: 'Acme Inc', type: 'text' },
    { label: 'Role', placeholder: 'Software Engineer', type: 'select' },
    { label: 'Website', placeholder: 'https://...', type: 'text' },
  ];

  // Field highlight positions (relative to browser content area)
  // Form is centered: max-width 600px in 1200px browser => starts at x=300
  // Wrapper padding: 16px 50px, FormMockup padding: 24px
  // Content starts at: 300 (center offset) + 24 (form padding) = 324px
  // Field input width: 600 - 48 (form padding) = 552px
  // Vertical: title ~32px, each field row ~66px (label 16px + gap 4px + input 36px + gap 10px)
  const fieldPositions = [
    { x: 324, y: 92, w: 552, h: 36 },
    { x: 324, y: 158, w: 552, h: 36 },
    { x: 324, y: 224, w: 552, h: 36 },
    { x: 324, y: 290, w: 552, h: 36 },
    { x: 324, y: 356, w: 552, h: 36 },
    { x: 324, y: 422, w: 552, h: 36 },
    { x: 324, y: 488, w: 552, h: 36 },
  ];

  // Eye button click happens at frame 40
  const highlightsVisible = frame > 50;

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

      {/* Title */}
      <AnimatedText
        text="See what Filliny sees."
        fontSize={48}
        fontWeight={700}
        color={colors.white}
        delay={5}
        mode="scaleReveal"
      />

      {/* Browser with form and highlights */}
      <div style={{ position: 'relative' }}>
        <BrowserMockup delay={10} width={BROWSER.width} height={BROWSER.height - 40} url="https://careers.example.com/apply">
          <div style={{ position: 'relative', padding: '16px 50px' }}>
            <FormMockup fields={formFields} title="Job Application" compact />

            {/* Field highlights with staggered reveal */}
            {highlightsVisible &&
              fieldPositions.map((pos, i) => (
                <FieldHighlight
                  key={i}
                  x={pos.x}
                  y={pos.y}
                  width={pos.w}
                  height={pos.h}
                  delay={i * 5}
                  color={colors.primary}
                />
              ))}
          </div>
        </BrowserMockup>

        {/* Cursor clicking the eye button */}
        <CursorPointer x={1150} y={72} delay={20} clickAt={40} />
      </div>

      {/* Field counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          opacity: interpolate(frame, [60, 75], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}>
        <CounterAnimation from={0} to={14} startFrame={60} endFrame={100} fontSize={48} fontWeight={700} color={colors.white} />
        <div style={{ fontFamily, fontSize: 28, color: colors.mutedForeground }}>fields detected</div>
      </div>
    </AbsoluteFill>
  );
};
