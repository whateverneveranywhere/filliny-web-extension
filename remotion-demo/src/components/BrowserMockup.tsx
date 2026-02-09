import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { colors, radius, BROWSER } from '../design/tokens';
import { SPRING_SMOOTH } from '../design/animations';

interface BrowserMockupProps {
  children: React.ReactNode;
  url?: string;
  delay?: number;
  width?: number;
  height?: number;
}

export const BrowserMockup: React.FC<BrowserMockupProps> = ({
  children,
  url = 'https://example.com/apply',
  delay = 0,
  width = BROWSER.width,
  height = BROWSER.height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation: scale from 0.95 to 1
  const scale = interpolate(
    spring({ frame: frame - delay, fps, config: SPRING_SMOOTH }),
    [0, 1],
    [0.95, 1],
  );

  // Fade in over 15 frames after delay
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3D perspective tilt: starts at -4deg, springs to 0 (Stripe-style)
  const tiltProgress = spring({ frame: frame - delay, fps, config: SPRING_SMOOTH });
  const rotateY = interpolate(tiltProgress, [0, 1], [-4, 0]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius.xl,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        transform: `perspective(1200px) rotateY(${rotateY}deg) scale(${scale})`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background,
      }}>
      {/* Title bar */}
      <div
        style={{
          height: 44,
          backgroundColor: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 8,
          flexShrink: 0,
        }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#CC4C40' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#D6993B' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#2EA043' }} />
        </div>
        {/* URL bar */}
        <div
          style={{
            flex: 1,
            height: 28,
            borderRadius: radius.sm,
            backgroundColor: colors.background,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12,
            fontSize: 13,
            color: colors.mutedForeground,
            fontFamily: 'system-ui, sans-serif',
            marginLeft: 12,
            border: `1px solid ${colors.border}`,
          }}>
          {url}
        </div>
      </div>
      {/* Content area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: colors.background,
        }}>
        {children}
      </div>
    </div>
  );
};
