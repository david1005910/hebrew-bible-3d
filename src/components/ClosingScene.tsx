import React from 'react';
import { Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneTitle } from './SceneTitle';
import { HebrewHighlight } from './HebrewHighlight';
import {
  hebrewTextStyle,
  koreanTextStyle,
  COLOR,
  TEXT_SHADOW,
  FONT,
} from '../styles/subtitle';
import { easeOutCubic, easeInCubic, clamp, sec } from '../utils/easing';
import type { Scene } from '../data/scenes';

interface Props {
  scene: Scene;
}

/**
 * Epilogue / closing scene: title → final verse → "טוֹב מְאֹד" big text.
 */
export const ClosingScene: React.FC<Props> = ({ scene }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {/* Title */}
      <Sequence from={sec(0.5, fps)} durationInFrames={sec(71.5, fps)}>
        <SceneTitle title={scene.title} subtitle={scene.subtitle} />
      </Sequence>

      {/* Final verse (1:31) */}
      <Sequence from={sec(8, fps)} durationInFrames={sec(44, fps)}>
        <FinalVerse scene={scene} durationSec={44} />
      </Sequence>

      {/* Big closing text */}
      <Sequence from={sec(54, fps)} durationInFrames={sec(18, fps)}>
        <BigClosing durationSec={18} />
      </Sequence>
    </>
  );
};

function FinalVerse({
  scene,
  durationSec,
}: {
  scene: Scene;
  durationSec: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const t1 = easeOutCubic(clamp(t / 1.5, 0, 1));
  const fadeOut = easeInCubic(
    clamp((t - (durationSec - 1.5)) / 1.5, 0, 1)
  );
  const opacity = Math.max(0, t1 - fadeOut);
  const pulse = 0.6 + 0.4 * Math.sin(t * 1.2);

  const v = scene.verses[0];

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${(1 - t1) * 40}px))`,
        width: 1600,
        textAlign: 'center',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: FONT.latin,
          fontStyle: 'italic',
          fontSize: 26,
          color: COLOR.text,
          textShadow: TEXT_SHADOW.base,
          letterSpacing: '0.2em',
          marginBottom: 36,
          opacity: 0.8,
        }}
      >
        {v.ref} · 모든 것의 결론
      </div>
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 72,
          lineHeight: 1.5,
          marginBottom: 40,
          padding: '0 80px',
        }}
      >
        <HebrewHighlight
          text={v.hebrew}
          highlight={v.highlight}
          pulse={pulse}
        />
      </div>
      <div
        style={{
          width: 60,
          height: 1,
          background: COLOR.divider,
          margin: '0 auto 32px',
        }}
      />
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 42,
          fontWeight: 500,
          padding: '0 100px',
        }}
      >
        {v.korean}
      </div>
    </div>
  );
}

function BigClosing({ durationSec }: { durationSec: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const t1 = easeOutCubic(clamp(t / 1.5, 0, 1));
  const fadeOut = easeInCubic(
    clamp((t - (durationSec - 1.5)) / 1.5, 0, 1)
  );
  const opacity = Math.max(0, t1 - fadeOut);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${(1 - t1) * 30}px))`,
        width: 1400,
        textAlign: 'center',
        opacity,
      }}
    >
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 140,
          fontWeight: 500,
          marginBottom: 20,
        }}
      >
        טוֹב מְאֹד
      </div>
      <div
        style={{
          fontFamily: FONT.latin,
          fontStyle: 'italic',
          fontSize: 40,
          color: COLOR.text,
          textShadow: TEXT_SHADOW.base,
          marginBottom: 40,
          opacity: 0.8,
        }}
      >
        tov me'od
      </div>
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 52,
          fontWeight: 500,
          marginBottom: 80,
        }}
      >
        매우 좋았다
      </div>
      <div
        style={{
          fontFamily: FONT.latin,
          fontSize: 22,
          color: COLOR.text,
          textShadow: TEXT_SHADOW.base,
          letterSpacing: '0.3em',
          textTransform: 'uppercase' as const,
          opacity: 0.7,
        }}
      >
        — 마침 —
      </div>
    </div>
  );
}
