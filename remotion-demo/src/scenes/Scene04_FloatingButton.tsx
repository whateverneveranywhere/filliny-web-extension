import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { AnimatedText } from '../components/AnimatedText';
import { BrowserMockup } from '../components/BrowserMockup';
import { FillinyButtonMockup } from '../components/FillinyButtonMockup';
import { FormMockup } from '../components/FormMockup';
import { colors, BROWSER } from '../design/tokens';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import type { FormField } from '../components/FormMockup';
import type React from 'react';

// 210 frames = 7 seconds
export const Scene04_FloatingButton: React.FC = () => {
  const frame = useCurrentFrame();

  const formFields: FormField[] = [
    { label: 'Full Name', placeholder: 'Enter your name', type: 'text' },
    { label: 'Email', placeholder: 'you@example.com', type: 'email' },
    { label: 'Phone', placeholder: '+1 (555) 000-0000', type: 'text' },
    { label: 'Company', placeholder: 'Company name', type: 'text' },
    { label: 'Message', placeholder: 'Tell us about yourself...', type: 'textarea' },
  ];

  // Show secondary buttons after delay
  const showSecondary = frame > 90;

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
        text="Always there when you need it."
        fontSize={48}
        fontWeight={700}
        color={colors.white}
        delay={5}
        mode="scaleReveal"
      />

      {/* Browser with form */}
      <div style={{ position: 'relative' }}>
        <BrowserMockup delay={10} width={BROWSER.width} height={BROWSER.height - 40}>
          <div style={{ padding: '30px 80px' }}>
            <FormMockup fields={formFields} title="Contact Form" compact />
          </div>
        </BrowserMockup>

        {/* Filliny button - positioned at top-right of browser content */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            right: 24,
          }}>
          <FillinyButtonMockup delay={40} showSecondary={showSecondary} secondaryDelay={10} />
        </div>
      </div>

      {/* Subtitle */}
      <AnimatedText
        text="Floating AI assistant on every page."
        fontSize={28}
        fontWeight={400}
        color={colors.mutedForeground}
        delay={50}
        mode="fadeSlide"
      />
    </AbsoluteFill>
  );
};
