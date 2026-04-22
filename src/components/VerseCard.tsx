import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import {
  hebrewTextStyle,
  koreanTextStyle,
  COLOR,
  TEXT_SHADOW,
  FONT,
} from '../styles/subtitle';
import { easeOutCubic, easeInCubic, clamp } from '../utils/easing';
import { HebrewHighlight } from './HebrewHighlight';
import type { Verse } from '../data/scenes';

interface Props {
  verse: Verse;
  index: number;
  total: number;
  durationSec: number; // duration of this verse segment in seconds
}

/**
 * A verse card showing Hebrew (gold), divider, Korean (white),
 * and an optional keyword highlight badge.
 * Positioned at bottom of frame with fade-in/out + slide.
 */
export const VerseCard: React.FC<Props> = ({
  verse,
  index,
  total,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entryDur = 1.3;
  const exitDur = 0.9;
  const exitStart = durationSec - exitDur;

  const tIn = easeOutCubic(clamp(t / entryDur, 0, 1));
  const tOut =
    t > exitStart
      ? easeInCubic(clamp((t - exitStart) / exitDur, 0, 1))
      : 0;
  const opacity = Math.max(0, tIn - tOut);
  const translateY = (1 - tIn) * 60 + tOut * -30;

  // Highlight pulse (starts after 2.5s)
  const highlightTime = Math.max(0, t - 2.5);
  const highlightPulse =
    0.4 + 0.6 * (0.5 + 0.5 * Math.sin(highlightTime * 2.4));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 60,
        opacity,
        transform: `translateY(${translateY * 0.5}px)`,
        textAlign: 'center',
        padding: '0 120px',
      }}
    >
      {/* Verse reference */}
      {verse.ref && (
        <div
          style={{
            fontFamily: FONT.latin,
            fontStyle: 'italic',
            fontSize: 24,
            color: COLOR.text,
            textShadow: TEXT_SHADOW.base,
            letterSpacing: '0.2em',
            marginBottom: 24,
            opacity: 0.8,
          }}
        >
          {verse.ref}
          <span style={{ margin: '0 14px', opacity: 0.5 }}>·</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {index + 1} / {total}
          </span>
        </div>
      )}

      {/* Hebrew text */}
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 88,
          fontWeight: 500,
          lineHeight: 1.3,
          marginBottom: 32,
        }}
      >
        <HebrewHighlight
          text={verse.hebrew}
          highlight={verse.highlight}
          pulse={highlightPulse}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          width: 60,
          height: 1,
          background: COLOR.divider,
          margin: '0 auto 28px',
          opacity: 0.6,
        }}
      />

      {/* Korean text */}
      <div
        style={{
          ...koreanTextStyle,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.5,
          marginBottom: 36,
        }}
      >
        {verse.korean}
      </div>

      {/* Highlight keyword explanation */}
      {verse.highlight && verse.highlightMean && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            padding: '12px 28px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 2,
          }}
        >
          <span
            style={{
              ...hebrewTextStyle,
              fontSize: 48,
              fontWeight: 600,
            }}
          >
            {verse.highlight}
          </span>
          <span style={{ color: COLOR.muted }}>·</span>
          <span
            style={{
              ...koreanTextStyle,
              fontSize: 20,
              letterSpacing: '0.05em',
            }}
          >
            {verse.highlightMean}
          </span>
        </div>
      )}
    </div>
  );
};
