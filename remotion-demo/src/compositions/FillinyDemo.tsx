import { Scene01_Problem } from '../scenes/Scene01_Problem';
import { Scene02_TimeCost } from '../scenes/Scene02_TimeCost';
import { Scene03_MeetFilliny } from '../scenes/Scene03_MeetFilliny';
import { Scene04_FloatingButton } from '../scenes/Scene04_FloatingButton';
import { Scene05_VisionMode } from '../scenes/Scene05_VisionMode';
import { Scene06_OneClickFill } from '../scenes/Scene06_OneClickFill';
import { Scene07_StreamingFill } from '../scenes/Scene07_StreamingFill';
import { Scene08_PerFieldAI } from '../scenes/Scene08_PerFieldAI';
import { Scene09_ProfileDashboard } from '../scenes/Scene09_ProfileDashboard';
import { Scene10_WorksEverywhere } from '../scenes/Scene10_WorksEverywhere';
import { Scene11_PrivacyTrust } from '../scenes/Scene11_PrivacyTrust';
import { Scene12_CallToAction } from '../scenes/Scene12_CallToAction';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile } from 'remotion';
import type { TransitionPresentation } from '@remotion/transitions';

const T = 30; // Transition duration in frames

// Varied transitions between scenes for visual interest
const transitions: TransitionPresentation<Record<string, unknown>>[] = [
  fade(), // 1→2: Problem → Time Cost (subtle text-to-text)
  slide({ direction: 'from-right' }), // 2→3: Time Cost → Meet Filliny (reveal)
  wipe({ direction: 'from-right' }), // 3→4: Meet Filliny → Floating Button (enter browser)
  fade(), // 4→5: Floating Button → Vision Mode (stay in browser)
  slide({ direction: 'from-bottom' }), // 5→6: Vision Mode → One-Click Fill (action)
  fade(), // 6→7: One-Click Fill → Streaming Fill (continuous flow)
  wipe({ direction: 'from-left' }), // 7→8: Streaming Fill → Per-Field AI (new feature)
  slide({ direction: 'from-right' }), // 8→9: Per-Field AI → Profile Dashboard (new section)
  flip({ direction: 'from-right' }), // 9→10: Profile Dashboard → Works Everywhere (showcase)
  fade(), // 10→11: Works Everywhere → Privacy (serious/trust)
  slide({ direction: 'from-bottom' }), // 11→12: Privacy → CTA (finale)
];

const scenes = [
  { Component: Scene01_Problem, duration: 210 },
  { Component: Scene02_TimeCost, duration: 150 },
  { Component: Scene03_MeetFilliny, duration: 180 },
  { Component: Scene04_FloatingButton, duration: 210 },
  { Component: Scene05_VisionMode, duration: 180 },
  { Component: Scene06_OneClickFill, duration: 150 },
  { Component: Scene07_StreamingFill, duration: 300 },
  { Component: Scene08_PerFieldAI, duration: 180 },
  { Component: Scene09_ProfileDashboard, duration: 180 },
  { Component: Scene10_WorksEverywhere, duration: 150 },
  { Component: Scene11_PrivacyTrust, duration: 120 },
  { Component: Scene12_CallToAction, duration: 180 },
];

/**
 * Background music: "Your Breath" by Eugenio Mininni (Mixkit Free License)
 * Corporate electronic — positive, futuristic, building.
 * Polished production with natural energy arc, SaaS product launch style.
 *
 * Track energy profile (RMS analysis):
 *   0–10s:  -19.7 dB  — subtle atmospheric pad (problem setup)
 *   10–20s: -17.0 dB  — layers arriving (time cost)
 *   20–30s: -15.6 dB  — building momentum (brand reveal)
 *   30–40s: -14.4 dB  — energy solidifying (features begin)
 *   40–60s: -13.0 dB  — strong presence (hero scene zone)
 *   60–90s: -12.5 dB  — peak energy (sustained features)
 *   90–150s: -11.5 dB — full power (track continues beyond video)
 *
 * Volume curve syncs track build with video narrative arc.
 * Track naturally builds, so curve amplifies the contrast:
 * quiet problem → brand reveal lift → hero peak → privacy dip → CTA finale.
 */
const musicVolume = (f: number): number =>
  interpolate(
    f,
    [
      0, // video start — silence
      30, // gentle fade-in
      210, // scene 1 ending — problem lands
      300, // scene 3 — brand reveal "Meet Filliny"
      450, // scene 4 — features begin (floating button)
      900, // scene 7 — HERO streaming fill starts
      1200, // scene 7 ends — hero peak
      1500, // scene 9 ends — dashboard
      1590, // scene 11 — privacy/trust
      1650, // trust settled
      1680, // scene 12 — CTA finale
      1810, // fade-out begins
      1860, // end — silence
    ],
    [
      0, // silent
      0.25, // fade in — subtle presence
      0.3, // hold through problem
      0.5, // lift for brand reveal — energy arrives
      0.6, // features — building with track
      0.75, // HERO — peak volume
      0.75, // hold hero
      0.65, // sustained for dashboard
      0.4, // pull back for privacy
      0.4, // hold dip
      0.7, // CTA finale lift
      0.2, // start fade
      0, // silence
    ],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

export const FillinyDemo: React.FC = () => (
  <AbsoluteFill>
    <Audio
      src={staticFile('audio/your-breath-eugenio-mininni.mp3')}
      volume={musicVolume}
      name="Background Music — Your Breath by Eugenio Mininni"
    />
    <TransitionSeries>
      {scenes.map(({ Component, duration }, index) => (
        <React.Fragment key={index}>
          <TransitionSeries.Sequence durationInFrames={duration}>
            <Component />
          </TransitionSeries.Sequence>
          {index < scenes.length - 1 && (
            <TransitionSeries.Transition
              presentation={transitions[index]}
              timing={linearTiming({ durationInFrames: T })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  </AbsoluteFill>
);
