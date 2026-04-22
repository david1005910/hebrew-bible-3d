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
import { easeOutCubic, clamp, sec } from '../utils/easing';
import type { Scene } from '../data/scenes';

interface Props {
  scene: Scene;
}

const DAYS = [
  { n: 1, label: '빛', hebrew: 'אוֹר', paired: 4, pairLabel: '해·달·별' },
  {
    n: 2,
    label: '하늘·바다',
    hebrew: 'שָׁמַיִם',
    paired: 5,
    pairLabel: '새·물고기',
  },
  {
    n: 3,
    label: '땅·식물',
    hebrew: 'יַבָּשָׁה',
    paired: 6,
    pairLabel: '짐승·사람',
  },
];

/**
 * Structure scene (scene 8): shows the Forming/Filling pattern of creation.
 */
export const StructureScene: React.FC<Props> = ({ scene }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence from={sec(0.5, fps)} durationInFrames={sec(10, fps)}>
        <SceneTitle title={scene.title} subtitle={scene.subtitle} />
      </Sequence>

      <Sequence from={sec(6, fps)} durationInFrames={sec(60, fps)}>
        <StructureDiagram />
      </Sequence>
    </>
  );
};

function StructureDiagram() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Progressive reveal over 6 seconds
  const p = clamp(t / 6, 0, 1);

  const circleStyle = (bg: string, color: string): React.CSSProperties => ({
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.latin,
    fontSize: 28,
    fontWeight: 600,
    color,
    textShadow: 'none',
    flexShrink: 0,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 1600,
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: 'center',
          ...koreanTextStyle,
          fontSize: 36,
          letterSpacing: '0.15em',
          marginBottom: 80,
          opacity: clamp(p * 3, 0, 1),
        }}
      >
        형성의 3일 ─ 채움의 3일
      </div>

      {/* Diagram grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 0,
          alignItems: 'center',
        }}
      >
        {/* Left - Forming */}
        <div>
          <div
            style={{
              fontFamily: FONT.latin,
              fontStyle: 'italic',
              fontSize: 24,
              color: COLOR.text,
              textShadow: TEXT_SHADOW.base,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.25em',
              marginBottom: 24,
              textAlign: 'right',
              paddingRight: 40,
              opacity: clamp(p * 3 - 0.3, 0, 1),
            }}
          >
            Forming — 형성
          </div>
          {DAYS.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 24,
                padding: '18px 40px 18px 0',
                borderRight: `1px solid ${COLOR.divider}`,
                opacity: clamp(p * 3 - 0.5 - i * 0.15, 0, 1),
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    ...hebrewTextStyle,
                    fontSize: 32,
                  }}
                >
                  {d.hebrew}
                </div>
                <div
                  style={{
                    ...koreanTextStyle,
                    fontSize: 22,
                    marginTop: 4,
                  }}
                >
                  {d.label}
                </div>
              </div>
              <div style={circleStyle('rgba(212, 175, 55, 0.7)', '#1a1510')}>
                {d.n}
              </div>
            </div>
          ))}
        </div>

        {/* Center arrow */}
        <div
          style={{
            width: 80,
            opacity: clamp(p * 3 - 1.2, 0, 1),
            fontFamily: FONT.latin,
            fontStyle: 'italic',
            fontSize: 20,
            color: COLOR.text,
            textShadow: TEXT_SHADOW.base,
            textAlign: 'center',
            letterSpacing: '0.15em',
          }}
        >
          ←→
        </div>

        {/* Right - Filling */}
        <div>
          <div
            style={{
              fontFamily: FONT.latin,
              fontStyle: 'italic',
              fontSize: 24,
              color: COLOR.text,
              textShadow: TEXT_SHADOW.base,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.25em',
              marginBottom: 24,
              textAlign: 'left',
              paddingLeft: 40,
              opacity: clamp(p * 3 - 0.3, 0, 1),
            }}
          >
            Filling — 채움
          </div>
          {DAYS.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '18px 0 18px 40px',
                borderLeft: `1px solid ${COLOR.divider}`,
                opacity: clamp(p * 3 - 0.8 - i * 0.15, 0, 1),
              }}
            >
              <div
                style={circleStyle('rgba(246, 244, 239, 0.2)', COLOR.text)}
              >
                {d.paired}
              </div>
              <div
                style={{
                  ...koreanTextStyle,
                  fontSize: 22,
                }}
              >
                {d.pairLabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day 7 - Sabbath */}
      <div
        style={{
          marginTop: 80,
          textAlign: 'center',
          opacity: clamp(p * 3 - 2.0, 0, 1),
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            padding: '16px 40px',
            background: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={circleStyle('rgba(212, 175, 55, 0.5)', COLOR.text)}
          >
            7
          </div>
          <div
            style={{
              ...hebrewTextStyle,
              fontSize: 32,
            }}
          >
            שַׁבָּת
          </div>
          <div
            style={{
              ...koreanTextStyle,
              fontSize: 24,
            }}
          >
            안식 · 샤바트
          </div>
        </div>
      </div>
    </div>
  );
}
