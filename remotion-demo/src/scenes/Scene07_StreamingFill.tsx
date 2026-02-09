import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate } from 'remotion';
import { BrowserMockup } from '../components/BrowserMockup';
import { FormMockup, type FormField } from '../components/FormMockup';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { FormsOverlayMockup } from '../components/FormsOverlayMockup';
import { colors, BROWSER } from '../design/tokens';
import { fontFamily } from '../design/fonts';

// 300 frames = 10 seconds (hero scene)
export const Scene07_StreamingFill: React.FC = () => {
  const frame = useCurrentFrame();

  const formFields: FormField[] = [
    { label: 'First Name', type: 'text', value: 'John', fillDelay: 20 },
    { label: 'Last Name', type: 'text', value: 'Doe', fillDelay: 40 },
    { label: 'Email', type: 'email', value: 'john.doe@example.com', fillDelay: 60 },
    { label: 'Phone', type: 'text', value: '+1 (555) 123-4567', fillDelay: 80 },
    { label: 'Company', type: 'text', value: 'Acme Corporation', fillDelay: 100 },
    { label: 'Position', type: 'text', value: 'Senior Developer', fillDelay: 120 },
    { label: 'Experience', type: 'select', value: '5+ years', fillDelay: 140 },
    { label: 'Cover Letter', type: 'textarea', value: 'I am excited to apply for this position...', fillDelay: 160 },
  ];

  // Progress: 0% to 100% over frames 20–240
  const progress = interpolate(frame, [20, 240], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const filledFields = Math.min(Math.floor(progress / 12.5), 8);
  const isComplete = frame > 250;

  // Overlay phase transitions
  const phase = isComplete ? 'complete' : frame > 10 ? 'streaming' : 'action';

  // Success flash on completion
  const successFlash = isComplete
    ? interpolate(frame, [250, 260, 280], [0, 0.2, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

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

      <BrowserMockup delay={10} width={BROWSER.width} height={BROWSER.height - 40} url="https://careers.example.com/apply">
        <div
          style={{
            position: 'relative',
            padding: '10px 50px',
            width: '100%',
            height: '100%',
          }}>
          <FormMockup
            fields={formFields}
            title="Job Application — Senior Developer"
            showValues={frame > 20}
            fillStartFrame={20}
            compact
          />

          {/* Success green overlay flash */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: colors.success,
              opacity: successFlash,
              pointerEvents: 'none',
            }}
          />

          {/* FormsOverlay covers the entire form content area */}
          <FormsOverlayMockup
            delay={10}
            phase={phase}
            progress={Math.round(progress)}
            totalFields={8}
            filledFields={filledFields}
          />
        </div>
      </BrowserMockup>

      {/* Completion text below browser */}
      {isComplete && (
        <div
          style={{
            fontFamily,
            fontSize: 40,
            fontWeight: 700,
            color: colors.white,
            marginTop: 0,
            opacity: interpolate(frame, [255, 270], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}>
          All fields filled in seconds.
        </div>
      )}
    </AbsoluteFill>
  );
};
