import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { fontFamily } from '../design/fonts';
import { BrowserMockup } from './BrowserMockup';
import { FillinyLogo } from './FillinyLogo';

interface ProfileCard {
  name: string;
  subtitle: string;
  active: boolean;
}

const profiles: ProfileCard[] = [
  { name: 'Personal', subtitle: '12 websites', active: true },
  { name: 'Work', subtitle: '8 websites', active: false },
  { name: 'Freelance', subtitle: '3 websites', active: false },
];

interface SidePanelMockupProps {
  delay?: number;
}

export const SidePanelMockup: React.FC<SidePanelMockupProps> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();

  const contentDelay = delay + 20;
  const contentOpacity = interpolate(frame, [contentDelay, contentDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <BrowserMockup url="chrome-extension://filliny/side-panel.html" delay={delay}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#1F1F1F',
        }}>
        {/* Header */}
        <div
          style={{
            height: 56,
            backgroundColor: 'rgba(31, 31, 31, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid #4A4A4A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
          }}>
          {/* Token display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily,
              fontSize: 13,
              color: '#BFBFBF',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BFBFBF" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            247 tokens
          </div>

          {/* Profile selector dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              color: '#E6E6E6',
              backgroundColor: '#454545',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #4A4A4A',
            }}>
            Personal
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E6E6E6" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          {/* Filliny logo */}
          <FillinyLogo size={28} animate={false} />
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#1F1F1F',
            opacity: contentOpacity,
          }}>
          {/* Profile cards */}
          {profiles.map((profile) => (
            <div
              key={profile.name}
              style={{
                padding: 14,
                borderRadius: 10,
                border: `1px solid ${profile.active ? '#E6E6E6' : '#4A4A4A'}`,
                backgroundColor: profile.active ? '#454545' : '#2E2E2E',
                fontFamily,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#E6E6E6',
                  }}>
                  {profile.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#BFBFBF',
                    marginTop: 2,
                  }}>
                  {profile.subtitle}
                </div>
              </div>
              {profile.active && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#353535',
                    backgroundColor: '#E6E6E6',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}>
                  Active
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </BrowserMockup>
  );
};
