import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneRenderer } from './SceneRenderer';
import { easeOutCubic, easeInCubic, clamp } from '../utils/easing';
import type { Scene } from '../data/scenes';

interface Props {
  scene: Scene;
  durationFrames?: number;
}

/**
 * Wraps a single scene with crossfade + slight slide transition.
 * Must be placed inside a <Sequence> so useCurrentFrame() returns local frame.
 */
export const SceneTransition: React.FC<Props> = ({ scene, durationFrames }) => {
  const frame = useCurrentFrame(); // local frame within this Sequence
  const { fps } = useVideoConfig();

  const localSec = frame / fps;
  const totalSec = (durationFrames ?? (72 * fps)) / fps;

  // Crossfade timing
  const fadeInDur = 1.2; // seconds
  const fadeOutDur = 1.2;

  let opacity = 1;
  let translateX = 0;

  if (localSec < fadeInDur) {
    const t = easeOutCubic(clamp(localSec / fadeInDur, 0, 1));
    opacity = t;
    translateX = (1 - t) * 40;
  } else if (localSec > totalSec - fadeOutDur) {
    const t = easeInCubic(
      clamp(
        (localSec - (totalSec - fadeOutDur)) / fadeOutDur,
        0,
        1
      )
    );
    opacity = 1 - t;
    translateX = -t * 40;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <SceneRenderer scene={scene} durationFrames={durationFrames} />
    </div>
  );
};
