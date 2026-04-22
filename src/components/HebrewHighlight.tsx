import React from 'react';
import { COLOR, TEXT_SHADOW } from '../styles/subtitle';

interface Props {
  text: string;
  highlight?: string;
  pulse?: number; // 0..1 glow intensity
}

/**
 * Renders Hebrew text with a highlighted keyword in gold with pulsing glow.
 */
export const HebrewHighlight: React.FC<Props> = ({
  text,
  highlight,
  pulse = 1,
}) => {
  if (!highlight || !text.includes(highlight.trim())) {
    return <>{text}</>;
  }

  const parts = text.split(highlight.trim());
  const glowRadius = 12 * pulse;

  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              style={{
                color: COLOR.hebrew,
                fontWeight: 700,
                textShadow: [
                  TEXT_SHADOW.hebrew,
                  `0 0 ${glowRadius}px rgba(212, 175, 55, 0.55)`,
                ].join(', '),
              }}
            >
              {highlight.trim()}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
};
