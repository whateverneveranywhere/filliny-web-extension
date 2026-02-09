import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { fontFamily } from '../design/fonts';
import { colors } from '../design/tokens';
import { SPRING_SMOOTH, SPRING_BOUNCY } from '../design/animations';

interface AnimatedTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  mode?: 'fade' | 'slide' | 'fadeSlide' | 'scaleReveal' | 'wordByWord';
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number;
}

const WORD_STAGGER_FRAMES = 6;

const WordSpan: React.FC<{
  word: string;
  index: number;
  delay: number;
  frame: number;
  fps: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: number;
}> = ({ word, index, delay, frame, fps, fontSize, fontWeight, color, letterSpacing }) => {
  const wordDelay = delay + index * WORD_STAGGER_FRAMES;

  const springProgress = spring({
    frame: frame - wordDelay,
    fps,
    config: SPRING_BOUNCY,
  });

  const opacity = interpolate(frame, [wordDelay, wordDelay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(springProgress, [0, 1], [0.6, 1]);
  const translateY = interpolate(springProgress, [0, 1], [20, 0]);

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily,
        fontSize,
        fontWeight,
        color,
        opacity,
        letterSpacing,
        transform: `perspective(1000px) scale(${scale}) translateY(${translateY}px)`,
        willChange: 'transform',
        marginRight: 12,
      }}>
      {word}
    </span>
  );
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize: size = 48,
  fontWeight = 600,
  color = colors.foreground,
  mode = 'scaleReveal',
  align = 'center',
  letterSpacing = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (mode === 'wordByWord') {
    const words = text.split(/\s+/);
    return (
      <div
        style={{
          textAlign: align,
          lineHeight: 1.3,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent:
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        }}>
        {words.map((word, i) => (
          <WordSpan
            key={`${word}-${i}`}
            word={word}
            index={i}
            delay={delay}
            frame={frame}
            fps={fps}
            fontSize={size}
            fontWeight={fontWeight}
            color={color}
            letterSpacing={letterSpacing}
          />
        ))}
      </div>
    );
  }

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let translateY = 0;
  let scale = 1;

  if (mode === 'slide' || mode === 'fadeSlide') {
    const s = spring({ frame: frame - delay, fps, config: SPRING_SMOOTH });
    translateY = interpolate(s, [0, 1], [50, 0]);
  }

  if (mode === 'scaleReveal') {
    const s = spring({ frame: frame - delay, fps, config: SPRING_BOUNCY });
    scale = interpolate(s, [0, 1], [1.3, 1]);
  }

  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight,
        color,
        opacity,
        letterSpacing,
        transform: `perspective(1000px) translateY(${translateY}px) scale(${scale})`,
        willChange: 'transform',
        textAlign: align,
        lineHeight: 1.3,
      }}>
      {text}
    </div>
  );
};
