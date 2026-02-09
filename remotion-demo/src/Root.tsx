import React from 'react';
import { Composition } from 'remotion';
import { FillinyDemo } from './compositions/FillinyDemo';
import { VIDEO } from './design/tokens';

export const Root: React.FC = () => {
  // 12 scenes with durations + 11 transitions of 30 frames each
  // Scene durations: 210+150+180+210+180+150+300+180+180+150+120+180 = 2190
  // Transitions overlap: 11 * 30 = 330
  // Total: 2190 - 330 = 1860
  // Adding a bit of buffer: let's use the exact calculation
  const totalDuration = 2190 - 330; // 1860 frames

  return (
    <>
      <Composition
        id="FillinyDemo"
        component={FillinyDemo}
        durationInFrames={totalDuration}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
