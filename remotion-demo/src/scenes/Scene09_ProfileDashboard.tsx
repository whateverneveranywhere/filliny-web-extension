import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { BrowserMockup } from '../components/BrowserMockup';
import { FormMockup } from '../components/FormMockup';
import { FillinyLogo } from '../components/FillinyLogo';
import { fontFamily } from '../design/fonts';
import { colors, radius } from '../design/tokens';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from 'remotion';
import { SPRING_SMOOTH } from '../design/animations';
import type React from 'react';

const formFields = [
  { label: 'Full Name', type: 'text' as const, placeholder: 'Enter your name' },
  { label: 'Email', type: 'email' as const, placeholder: 'you@example.com' },
  { label: 'Company', type: 'text' as const, placeholder: 'Company name' },
  { label: 'Role', type: 'select' as const, placeholder: 'Select a role' },
  { label: 'Message', type: 'textarea' as const, placeholder: 'Tell us more...' },
];

const BROWSER_WIDTH = 820;
const SIDEBAR_WIDTH = 320;
const PANEL_HEIGHT = 560;

// 180 frames = 6 seconds
export const Scene09_ProfileDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sidebar entrance animation
  const sidebarDelay = 15;
  const sidebarSlide = interpolate(
    spring({ frame: frame - sidebarDelay, fps, config: SPRING_SMOOTH }),
    [0, 1],
    [40, 0],
  );
  const sidebarOpacity = interpolate(frame, [sidebarDelay, sidebarDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Content inside sidebar fades in after sidebar appears
  const contentDelay = sidebarDelay + 20;
  const contentOpacity = interpolate(frame, [contentDelay, contentDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Title fade-in
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(spring({ frame, fps, config: SPRING_SMOOTH }), [0, 1], [20, 0]);

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

      {/* Title area */}
      <div
        style={{
          fontFamily,
          fontSize: 48,
          fontWeight: 800,
          color: colors.white,
          textAlign: 'center',
          marginBottom: 40,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          position: 'relative',
          zIndex: 1,
        }}>
        Multiple profiles. One dashboard.
      </div>

      {/* Visual area: browser + sidebar */}
      <div
        style={{
          display: 'flex',
          position: 'relative',
          zIndex: 1,
        }}>
        {/* LEFT: Browser mockup with form */}
        <BrowserMockup url="https://acme.com/apply" delay={5} width={BROWSER_WIDTH} height={PANEL_HEIGHT}>
          <FormMockup fields={formFields} title="Job Application" compact />
        </BrowserMockup>

        {/* RIGHT: Chrome side panel */}
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: PANEL_HEIGHT,
            backgroundColor: colors.background,
            borderLeft: `1px solid ${colors.border}`,
            borderTopRightRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '10px 20px 60px rgba(0,0,0,0.4)',
            opacity: sidebarOpacity,
            transform: `translateX(${sidebarSlide}px)`,
          }}>
          {/* Side panel title bar (matches browser chrome height) */}
          <div
            style={{
              height: 44,
              backgroundColor: colors.card,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              gap: 8,
            }}>
            <FillinyLogo size={22} animate={false} />
            <span
              style={{
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                color: colors.foreground,
              }}>
              Filliny
            </span>
          </div>

          {/* Header: token display | profile selector | settings */}
          <div
            style={{
              height: 48,
              backgroundColor: 'rgba(31, 31, 31, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              flexShrink: 0,
              opacity: contentOpacity,
            }}>
            {/* LEFT: Token count display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.mutedForeground}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span
                  style={{
                    fontFamily,
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.foreground,
                  }}>
                  247
                </span>
                <span
                  style={{
                    fontFamily,
                    fontSize: 9,
                    color: colors.mutedForeground,
                  }}>
                  tokens
                </span>
              </div>
            </div>

            {/* CENTER: Profile selector button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily,
                fontSize: 12,
                fontWeight: 600,
                color: colors.foreground,
                backgroundColor: colors.secondary,
                padding: '5px 12px',
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                maxWidth: 160,
                cursor: 'pointer',
              }}>
              {/* ClipboardList icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.foreground}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
                <path d="M8 11h.01" />
                <path d="M8 16h.01" />
              </svg>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                Personal
              </span>
              {/* ChevronDown icon */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.foreground}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            {/* RIGHT: Settings gear icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.mutedForeground}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>

          {/* Main content area */}
          <div
            style={{
              flex: 1,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              backgroundColor: colors.background,
              opacity: contentOpacity,
              overflowY: 'hidden',
            }}>
            {/* Active on this site card */}
            <div
              style={{
                padding: 14,
                borderRadius: radius.lg,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                fontFamily,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
              {/* Favicon circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  backgroundColor: colors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.foreground }}>A</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.foreground,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  acme.com
                </div>
                <div style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 1 }}>
                  Job Application
                </div>
              </div>
              {/* Green dot + Enabled badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.success,
                  backgroundColor: 'rgba(74, 222, 128, 0.12)',
                  padding: '3px 8px',
                  borderRadius: radius.full,
                  flexShrink: 0,
                }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: radius.full,
                    backgroundColor: colors.success,
                  }}
                />
                Enabled
              </div>
            </div>

            {/* Profile info card */}
            <div
              style={{
                padding: 14,
                borderRadius: radius.lg,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                fontFamily,
              }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.foreground }}>
                    Personal
                  </div>
                  <div style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                    12 websites
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: colors.primaryForeground,
                    backgroundColor: colors.primary,
                    padding: '2px 8px',
                    borderRadius: radius.sm,
                  }}>
                  Active
                </div>
              </div>
              {/* Mini stat row */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}>
                <div
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: radius.sm,
                    backgroundColor: colors.secondary,
                    textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>23</div>
                  <div style={{ fontSize: 9, color: colors.mutedForeground }}>Forms</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: radius.sm,
                    backgroundColor: colors.secondary,
                    textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>89</div>
                  <div style={{ fontSize: 9, color: colors.mutedForeground }}>Fields</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: radius.sm,
                    backgroundColor: colors.secondary,
                    textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>14m</div>
                  <div style={{ fontSize: 9, color: colors.mutedForeground }}>Saved</div>
                </div>
              </div>
            </div>

            {/* Auto-Fill Form button */}
            <div
              style={{
                marginTop: 4,
                padding: '12px 0',
                borderRadius: radius.lg,
                backgroundColor: colors.primary,
                fontFamily,
                fontSize: 14,
                fontWeight: 700,
                color: colors.primaryForeground,
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              {/* Zap icon */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.primaryForeground}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Auto-Fill Form
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Recent activity footer text */}
            <div
              style={{
                fontFamily,
                fontSize: 11,
                color: colors.mutedForeground,
                textAlign: 'center',
                paddingTop: 8,
                borderTop: `1px solid ${colors.border}`,
              }}>
              23 forms filled this week
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
