import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors, radius, buttonSizes } from '../design/tokens';
import { SPRING_SMOOTH } from '../design/animations';

const ROTATING_MESSAGES = [
  'Analyzing form structure...',
  'Reading field requirements...',
  'Matching context to fields...',
  'Generating values...',
  'Almost there...',
];

const MESSAGE_CYCLE_FRAMES = 90; // 3 seconds at 30fps

interface FormsOverlayMockupProps {
  delay?: number;
  phase?: 'action' | 'streaming' | 'complete';
  progress?: number;
  totalFields?: number;
  filledFields?: number;
}

export const FormsOverlayMockup: React.FC<FormsOverlayMockupProps> = ({
  delay = 0,
  phase = 'action',
  progress = 0,
  totalFields = 14,
  filledFields = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animation: scale 0.98 -> 1 and opacity 0 -> 1
  const springProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_SMOOTH,
  });

  const scale = interpolate(springProgress, [0, 1], [0.98, 1]);
  const opacity = interpolate(springProgress, [0, 1], [0, 1]);

  // Rotating message index for streaming phase
  const adjustedFrame = Math.max(0, frame - delay);
  const messageIndex = Math.floor(adjustedFrame / MESSAGE_CYCLE_FRAMES) % ROTATING_MESSAGES.length;

  // Loader rotation for streaming phase
  const loaderRotation = (adjustedFrame * 12) % 360;

  // Determine background and blur based on phase
  const isLoading = phase === 'streaming';
  const overlayBg = isLoading ? colors.overlayLoading : colors.overlayIdle;
  const backdropBlur = isLoading ? 'blur(4px)' : 'blur(12px)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: radius.lg,
        backgroundColor: overlayBg,
        backdropFilter: backdropBlur,
        WebkitBackdropFilter: backdropBlur,
        transform: `scale(${scale})`,
        opacity,
        fontFamily,
        overflow: 'hidden',
      }}>
      {/* Close button — top-right */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          width: buttonSizes.closeButton,
          height: buttonSizes.closeButton,
          borderRadius: radius.full,
          backgroundColor: colors.overlayMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
        {/* X icon 16x16 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* Centered content area */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
        {/* ===== ACTION PHASE ===== */}
        {phase === 'action' && (
          <>
            {/* Fill button */}
            <div
              style={{
                height: 48,
                padding: '0 32px',
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
                borderRadius: radius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
              {/* Wand2 icon 20x20 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2" />
                <path d="M15 16v-2" />
                <path d="M8 9h2" />
                <path d="M20 9h2" />
                <path d="M17.8 11.8 19 13" />
                <path d="M17.8 6.2 19 5" />
                <path d="M3 21l9-9" />
                <path d="M12.2 6.2 11 5" />
              </svg>
              Auto-Fill Form
            </div>
            {/* Subtitle */}
            <div
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                textAlign: 'center',
              }}>
              Click to automatically fill with AI
            </div>
          </>
        )}

        {/* ===== STREAMING PHASE ===== */}
        {phase === 'streaming' && (
          <>
            {/* Loader icon + title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: colors.white,
                fontSize: 16,
                fontWeight: 600,
              }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${loaderRotation}deg)`,
                }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Filling Your Form
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: 280,
                height: 8,
                borderRadius: radius.full,
                backgroundColor: colors.overlayTrack,
                overflow: 'hidden',
              }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: radius.full,
                  backgroundColor: colors.white,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Status text */}
            <div
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                textAlign: 'center',
              }}>
              Filling {filledFields} of {totalFields} fields...
            </div>

            {/* Rotating message */}
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                marginTop: 4,
              }}>
              {ROTATING_MESSAGES[messageIndex]}
            </div>
          </>
        )}

        {/* ===== COMPLETE PHASE ===== */}
        {phase === 'complete' && (
          <>
            {/* Checkmark circle icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: colors.white,
                fontSize: 16,
                fontWeight: 600,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={colors.success} strokeWidth="2" />
                <path d="M8 12l3 3 5-5" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Form Filled!
            </div>

            {/* Full progress bar — green */}
            <div
              style={{
                width: 280,
                height: 8,
                borderRadius: radius.full,
                backgroundColor: colors.overlayTrack,
                overflow: 'hidden',
              }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: radius.full,
                  backgroundColor: colors.success,
                }}
              />
            </div>

            {/* Done subtitle */}
            <div
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                textAlign: 'center',
              }}>
              Done!
            </div>
          </>
        )}
      </div>
    </div>
  );
};
