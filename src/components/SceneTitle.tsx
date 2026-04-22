import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { hebrewTextStyle, koreanTextStyle, COLOR, TEXT_SHADOW, FONT } from '../styles/subtitle';
import { easeOutCubic, easeInCubic, clamp, sec } from '../utils/easing';

interface Props {
  title: string; // Hebrew title
  subtitle: string; // Korean subtitle
}

/**
 * Large Hebrew title + Korean subtitle that appears at the start of each scene.
 * Fades in staggered, then fades out after ~5.5 seconds.
 */
export const SceneTitle: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps; // local time in seconds

  // Staggered entry
  const t1 = easeOutCubic(clamp(t / 1.4, 0, 1));
  const t3 = easeOutCubic(clamp((t - 1.0) / 1.2, 0, 1));

  // Fade out after 5.5s
  const fadeOut = easeInCubic(clamp((t - 5.5) / 1.5, 0, 1));
  const opacity = 1 - fadeOut;
  const translateY = fadeOut * -40;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${translateY}px))`,
        opacity,
        textAlign: 'center',
        width: 1600,
      }}
    >
      {/* Hebrew large text */}
      <div
        style={{
          ...hebrewTextStyle,
          fontSize: 200,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '0.01em',
          opacity: t1,
          transform: `translateY(${(1 - t1) * 40}px)`,
        }}
      >
        {title}
      </div>

      {/* Korean subtitle */}
      <div
        style={{
          fontFamily: `${FONT.korean}, ${FONT.latin}`,
          color: COLOR.text,
          textShadow: TEXT_SHADOW.base,
          fontSize: 40,
          fontWeight: 400,
          marginTop: 48,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: t3,
          transform: `translateY(${(1 - t3) * 24}px)`,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 48,
            height: 1,
            background: COLOR.divider,
            verticalAlign: 'middle',
            marginRight: 24,
          }}
        />
        {subtitle}
        <span
          style={{
            display: 'inline-block',
            width: 48,
            height: 1,
            background: COLOR.divider,
            verticalAlign: 'middle',
            marginLeft: 24,
          }}
        />
      </div>
    </div>
  );
};
