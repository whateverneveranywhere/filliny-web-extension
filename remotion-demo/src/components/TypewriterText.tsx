import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors } from '../design/tokens';
import { typewriterText } from '../design/animations';

interface TypewriterTextProps {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  showCursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.6,
  fontSize: size = 32,
  fontWeight = 400,
  color = colors.mutedForeground,
  showCursor = true,
}) => {
  const frame = useCurrentFrame();
  const displayed = typewriterText(text, frame, startFrame, charsPerFrame);
  const isComplete = displayed.length === text.length;
  const cursorVisible = !isComplete && frame % 16 < 10;

  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight,
        color,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.4,
      }}>
      {displayed}
      {showCursor && (
        <span style={{ opacity: cursorVisible ? 1 : 0, color: colors.muted }}>|</span>
      )}
    </div>
  );
};
