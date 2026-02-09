import React from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { BrowserMockup } from '../components/BrowserMockup';
import { FormMockup, type FormField } from '../components/FormMockup';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { FormsOverlayMockup } from '../components/FormsOverlayMockup';
import { CursorPointer } from '../components/CursorPointer';
import { AnimatedText } from '../components/AnimatedText';
import { colors, BROWSER } from '../design/tokens';

// 150 frames = 5 seconds
export const Scene06_OneClickFill: React.FC = () => {
  const frame = useCurrentFrame();

  const formFields: FormField[] = [
    { label: 'Full Name', placeholder: 'Enter your name', type: 'text' },
    { label: 'Email', placeholder: 'you@example.com', type: 'email' },
    { label: 'Phone', placeholder: '+1 (555) 000-0000', type: 'text' },
    { label: 'Company', placeholder: 'Company name', type: 'text' },
  ];

  // Overlay fades in, cursor clicks Auto-Fill
  const overlayVisible = frame > 20;

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
      <AnimatedText text="One Click. Done." fontSize={48} fontWeight={700} color={colors.white} delay={5} mode="scaleReveal" />

      {/* Subtitle */}
      <AnimatedText text="Auto-Fill Form" fontSize={32} fontWeight={600} color={colors.mutedForeground} delay={15} mode="fadeSlide" />

      <div style={{ position: 'relative' }}>
        <BrowserMockup delay={10} width={BROWSER.width} height={BROWSER.height - 40} url="https://example.com/register">
          <div style={{ position: 'relative', padding: '16px 50px', width: '100%', height: '100%' }}>
            <FormMockup fields={formFields} title="Registration" compact />
            {overlayVisible && <FormsOverlayMockup delay={20} phase="action" />}
          </div>
        </BrowserMockup>

        {/* Cursor clicking Auto-Fill button — targets center of the overlay */}
        <CursorPointer x={600} y={350} delay={50} clickAt={90} />
      </div>
    </AbsoluteFill>
  );
};
