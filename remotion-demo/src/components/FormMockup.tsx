import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { fontFamily } from '../design/fonts';

export interface FormField {
  label: string;
  type?: 'text' | 'email' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  value?: string;
  fillDelay?: number;
}

interface FormMockupProps {
  fields: FormField[];
  title?: string;
  showValues?: boolean;
  fillStartFrame?: number;
  compact?: boolean;
}

export const FormMockup: React.FC<FormMockupProps> = ({
  fields,
  title = 'Application Form',
  showValues = false,
  fillStartFrame = 0,
  compact = false,
}) => {
  const frame = useCurrentFrame();
  const fieldHeight = compact ? 36 : 42;
  const gap = compact ? 10 : 14;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: 24,
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        backgroundColor: 'transparent',
      }}>
      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: compact ? 18 : 22,
          fontWeight: 700,
          color: '#E6E6E6',
          marginBottom: 8,
        }}>
        {title}
      </div>

      {fields.map((field, i) => {
        const fillProgress =
          showValues && field.fillDelay !== undefined
            ? interpolate(frame, [fillStartFrame + field.fillDelay, fillStartFrame + field.fillDelay + 15], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 0;

        const displayValue =
          showValues && field.value && field.fillDelay !== undefined
            ? field.value.slice(0, Math.floor(fillProgress * field.value.length))
            : '';

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Field label */}
            <div
              style={{
                fontFamily,
                fontSize: compact ? 12 : 13,
                fontWeight: 600,
                color: '#BFBFBF',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
              {field.label}
            </div>

            {field.type === 'checkbox' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: fieldHeight }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${fillProgress > 0 ? '#EBEBEB' : '#4A4A4A'}`,
                    backgroundColor: fillProgress > 0 ? '#EBEBEB' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {fillProgress > 0 && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#353535" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontFamily, fontSize: 14, color: '#E6E6E6' }}>
                  {field.placeholder || 'I agree'}
                </span>
              </div>
            ) : field.type === 'textarea' ? (
              <div
                style={{
                  height: fieldHeight * 2,
                  borderRadius: 8,
                  border: '1px solid #4A4A4A',
                  backgroundColor: '#2E2E2E',
                  paddingLeft: 12,
                  paddingTop: 10,
                  fontFamily,
                  fontSize: 14,
                  color: displayValue ? '#FFFFFF' : '#5A5A5A',
                }}>
                {displayValue || field.placeholder || ''}
              </div>
            ) : (
              <div
                style={{
                  height: fieldHeight,
                  borderRadius: 8,
                  border: '1px solid #4A4A4A',
                  backgroundColor: '#2E2E2E',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 12,
                  fontFamily,
                  fontSize: 14,
                  color: displayValue ? '#FFFFFF' : '#5A5A5A',
                }}>
                {displayValue || field.placeholder || ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
