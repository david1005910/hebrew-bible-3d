import React from 'react';
import { PrologueScene } from './PrologueScene';
import { DayScene } from './DayScene';
import { StructureScene } from './StructureScene';
import { ClosingScene } from './ClosingScene';
import type { Scene } from '../data/scenes';

interface Props {
  scene: Scene;
  durationFrames?: number;
}

/**
 * Dispatches to the correct scene component based on scene.id.
 */
export const SceneRenderer: React.FC<Props> = ({ scene, durationFrames }) => {
  if (scene.id === 'prologue') {
    return <PrologueScene scene={scene} />;
  }
  if (scene.id === 'epilogue' || scene.closing) {
    return <ClosingScene scene={scene} />;
  }
  if (scene.structure) {
    return <StructureScene scene={scene} />;
  }
  if (scene.verseScene) {
    return <DayScene scene={scene} durationFrames={durationFrames} />;
  }
  if (scene.dayLabel) {
    return <DayScene scene={scene} />;
  }
  return null;
};
