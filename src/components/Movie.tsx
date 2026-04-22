import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { SCENES, type Scene } from '../data/scenes';
import { SceneTransition } from './SceneTransition';
import { SCENE_DURATION_FRAMES, COLOR } from '../styles/subtitle';

export type MovieProps = {
  bgVideoSrc?: string;
  bgVideoOpacity?: number;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
  subtitleScenes?: Scene[];
  /** 동적 장면 duration (BibleVerseSubtitles용). 없으면 기본 SCENE_DURATION_FRAMES 사용. */
  sceneDurationFrames?: number;
  /** 구절 범위 입력 (calculateMetadata에서만 사용) */
  verseRange?: string;
  [key: string]: unknown;
};

/**
 * Main composition: background video + scenes with crossfade transitions.
 * Progress bar at top shows overall progress.
 *
 * subtitleScenes가 주어지면 그것을 사용하고, 없으면 기본 SCENES를 사용.
 * sceneDurationFrames로 장면 길이 조절 가능 (동적 구절 로딩 시).
 */
export const Movie: React.FC<MovieProps> = ({
  bgVideoSrc,
  bgVideoOpacity = 1,
  bgMusicSrc,
  bgMusicVolume,
  subtitleScenes,
  sceneDurationFrames: customDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scenes = subtitleScenes ?? SCENES;
  const perSceneFrames = customDurationFrames ?? SCENE_DURATION_FRAMES;

  const currentIndex = Math.min(
    scenes.length - 1,
    Math.floor(frame / perSceneFrames)
  );

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Background video layer */}
      {bgVideoSrc && (
        <AbsoluteFill style={{ opacity: bgVideoOpacity }}>
          <OffthreadVideo
            src={staticFile(`bg-video/${bgVideoSrc}`)}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Background music */}
      {bgMusicSrc && (
        <Audio
          src={staticFile(`bg-music/${bgMusicSrc}`)}
          volume={bgMusicVolume ?? 0.3}
        />
      )}

      {/* Subtitle layer */}
      <AbsoluteFill>
        {scenes.map((scene, i) => {
          // Only mount current + adjacent scenes for performance
          if (i < currentIndex - 1 || i > currentIndex + 1) return null;

          const startFrame = i * perSceneFrames;
          const endFrame = startFrame + perSceneFrames;

          // Skip if completely out of range (with 0.5s buffer)
          if (frame < startFrame - 15 || frame > endFrame + 15) return null;

          return (
            <Sequence
              key={scene.id}
              from={startFrame}
              durationInFrames={perSceneFrames}
            >
              <SceneTransition scene={scene} durationFrames={perSceneFrames} />
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* Overall progress bar (top) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 50,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(frame / durationInFrames) * 100}%`,
            background: COLOR.hebrew,
            opacity: 0.6,
          }}
        />
      </div>

      {/* Chapter markers */}
      {scenes.map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${(i / scenes.length) * 100}%`,
            width: 1,
            height: 8,
            background: 'rgba(255, 255, 255, 0.2)',
            zIndex: 51,
          }}
        />
      ))}

    </AbsoluteFill>
  );
};
