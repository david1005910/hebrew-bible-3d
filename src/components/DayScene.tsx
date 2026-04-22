import React from 'react';
import { Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneTitle } from './SceneTitle';
import { VerseCard } from './VerseCard';
import {
  hebrewTextStyle,
  koreanTextStyle,
  COLOR,
} from '../styles/subtitle';
import { easeOutCubic, easeInCubic, clamp, sec } from '../utils/easing';
import { HEBREW_ORDINALS, KOREAN_ORDINALS } from '../data/scenes';
import type { Scene } from '../data/scenes';

interface Props {
  scene: Scene;
  durationFrames?: number;
}

/**
 * A "Day" scene (days 1–7): title → verses → closing marker.
 * For original 72s scenes: title 0–8s, verses 8–66s, closing 66–72s.
 * For dynamic scenes: timing is proportional to actual duration.
 */
export const DayScene: React.FC<Props> = ({ scene, durationFrames }) => {
  const { fps } = useVideoConfig();
  const verses = scene.verses;

  // Total scene duration in seconds (default 72s for original scenes)
  const totalSec = durationFrames ? durationFrames / fps : 72;

  // Proportional timing: title ~11%, closing ~8%, verses get the rest
  const hasClosing = Boolean(scene.dayLabel && !scene.verseScene);
  const titleEnd = Math.max(2, Math.min(8, totalSec * 0.12));
  const closingDuration = hasClosing ? Math.max(2, Math.min(6, totalSec * 0.08)) : 0;
  const closingStart = totalSec - closingDuration;
  const verseDuration = (closingStart - titleEnd) / verses.length;

  return (
    <>
      {/* Scene title: 0.3s – 8.2s */}
      <Sequence
        from={sec(0.3, fps)}
        durationInFrames={sec(titleEnd - 0.3 + 0.2, fps)}
      >
        <SceneTitle title={scene.title} subtitle={scene.subtitle} />
      </Sequence>

      {/* Verse cards */}
      {verses.map((verse, i) => {
        const start = titleEnd + i * verseDuration;
        return (
          <Sequence
            key={i}
            from={sec(start, fps)}
            durationInFrames={sec(verseDuration, fps)}
          >
            <VerseCard
              verse={verse}
              index={i}
              total={verses.length}
              durationSec={verseDuration}
            />
          </Sequence>
        );
      })}

      {/* Closing marker (skip for dynamically generated verse scenes) */}
      {scene.dayLabel && !scene.verseScene && (
        <Sequence
          from={sec(closingStart, fps)}
          durationInFrames={sec(closingDuration, fps)}
        >
          <DayClosingMarker
            dayLabel={scene.dayLabel}
            durationSec={closingDuration}
          />
        </Sequence>
      )}
    </>
  );
};

// ── Day closing marker ─────────────────────────────────────────
function DayClosingMarker({
  dayLabel,
  durationSec,
}: {
  dayLabel: string;
  durationSec: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const t1 = easeOutCubic(clamp(t / 1.0, 0, 1));
  const fadeOut = easeInCubic(
    clamp((t - (durationSec - 1.0)) / 1.0, 0, 1)
  );
  const opacity = t1 - fadeOut;

  const dayIndex = parseInt(dayLabel, 10) - 1;
  const hebrewOrdinal = HEBREW_ORDINALS[dayIndex] || '';
  const koreanOrdinal = KOREAN_ORDINALS[dayIndex] || '';

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${(1 - t1) * 20}px))`,
        width: 1500,
        textAlign: 'center',
        opacity: Math.max(0, opacity),
      }}
    >
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 44,
          lineHeight: 1.5,
          marginBottom: 24,
        }}
      >
        וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם {hebrewOrdinal}
      </div>
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 30,
        }}
      >
        저녁이 되고 아침이 되니 —{' '}
        <span style={{ color: COLOR.hebrew, fontWeight: 600 }}>
          {koreanOrdinal}날
        </span>
        이었다
      </div>
    </div>
  );
}
