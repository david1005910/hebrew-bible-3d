import React from 'react';
import { Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneTitle } from './SceneTitle';
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
 * Prologue scene (scene 0): big title → Genesis 1:1 quote → overview text.
 */
export const PrologueScene: React.FC<Props> = ({ scene }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {/* Large title: 0.5s – 22s */}
      <Sequence from={sec(0.5, fps)} durationInFrames={sec(21.5, fps)}>
        <SceneTitle title={scene.title} subtitle={scene.subtitle} />
      </Sequence>

      {/* Genesis 1:1 quote: 8s – 38s */}
      <Sequence from={sec(8, fps)} durationInFrames={sec(30, fps)}>
        <PrologueQuote durationSec={30} />
      </Sequence>

      {/* Overview text: 40s – 72s */}
      <Sequence from={sec(40, fps)} durationInFrames={sec(32, fps)}>
        <PrologueOverview durationSec={32} />
      </Sequence>
    </>
  );
};

function PrologueQuote({ durationSec }: { durationSec: number }) {
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
        transform: `translate(-50%, calc(-50% + ${(1 - t1) * 40}px))`,
        width: 1500,
        textAlign: 'center',
        opacity,
      }}
    >
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 92,
          lineHeight: 1.5,
          marginBottom: 48,
        }}
      >
        בְּרֵאשִׁית בָּרָא אֱלֹהִים
        <br />
        אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ
      </div>
      <div
        style={{
          width: 80,
          height: 1,
          background: COLOR.divider,
          margin: '0 auto 40px',
        }}
      />
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 44,
          fontWeight: 500,
        }}
      >
        태초에 하나님이 하늘들과 땅을 창조하셨다
      </div>
    </div>
  );
}

function PrologueOverview({ durationSec }: { durationSec: number }) {
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
          fontFamily: FONT.latin,
          fontStyle: 'italic',
          fontSize: 28,
          color: COLOR.text,
          textShadow: TEXT_SHADOW.base,
          letterSpacing: '0.3em',
          textTransform: 'uppercase' as const,
          marginBottom: 40,
          opacity: 0.8,
        }}
      >
        בְּרֵאשִׁית · Genesis 1:1 – 2:3
      </div>
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 56,
          fontWeight: 500,
          lineHeight: 1.5,
          marginBottom: 32,
        }}
      >
        창조의 일곱 날
        <br />
        <span
          style={{
            color: COLOR.hebrew,
            textShadow: TEXT_SHADOW.hebrew,
            fontSize: 42,
            letterSpacing: '0.1em',
          }}
        >
          히브리어로 읽는 창세기
        </span>
      </div>
      <div
        style={{
          width: 120,
          height: 1,
          background: COLOR.divider,
          margin: '40px auto',
        }}
      />
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 24,
          letterSpacing: '0.15em',
          opacity: 0.8,
        }}
      >
        10개의 장면으로 만나는 성경의 시작
      </div>
    </div>
  );
}
