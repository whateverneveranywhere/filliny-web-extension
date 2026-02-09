import React from 'react';
import { useCurrentFrame, AbsoluteFill } from 'remotion';
import { NoiseDotGrid } from '../components/NoiseDotGrid';
import { colors } from '../design/tokens';
import { fontFamily } from '../design/fonts';
import { fadeIn, staggerDelay } from '../design/animations';

// Lock SVG icon
const LockIcon: React.FC = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.white}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Shield SVG icon
const ShieldIcon: React.FC = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.white}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Check circle SVG icon
const CheckCircleIcon: React.FC = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.white}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// 120 frames = 4 seconds
export const Scene11_PrivacyTrust: React.FC = () => {
  const frame = useCurrentFrame();

  const trustStatements = [
    { Icon: LockIcon, text: 'AES-256 encryption.' },
    { Icon: ShieldIcon, text: 'GDPR compliant.' },
    { Icon: CheckCircleIcon, text: 'Your data stays yours.' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
      }}>
      <NoiseDotGrid />
      {trustStatements.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            opacity: fadeIn(frame, 10 + staggerDelay(i, 25)),
          }}>
          <item.Icon />
          <div
            style={{
              fontFamily,
              fontSize: 52,
              fontWeight: 700,
              color: colors.white,
            }}>
            {item.text}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
