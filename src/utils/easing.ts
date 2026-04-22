// Easing functions — same as the original prototype's animations.jsx

export const easeInCubic = (t: number): number => t * t * t;
export const easeOutCubic = (t: number): number => --t * t * t + 1;
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * Convert seconds to frame count at given fps.
 */
export const sec = (seconds: number, fps: number): number =>
  Math.round(seconds * fps);

/**
 * Compute fade-in / fade-out opacity from a local frame count.
 * Returns 0..1 with easeOutCubic in, easeInCubic out.
 */
export function fadeInOut(
  localFrame: number,
  durationFrames: number,
  fps: number,
  fadeInSec: number = 1.2,
  fadeOutSec: number = 1.0
): number {
  const fadeIn = sec(fadeInSec, fps);
  const fadeOut = sec(fadeOutSec, fps);
  const exitStart = durationFrames - fadeOut;

  if (localFrame < fadeIn) {
    return easeOutCubic(clamp(localFrame / fadeIn, 0, 1));
  }
  if (localFrame > exitStart) {
    return 1 - easeInCubic(clamp((localFrame - exitStart) / fadeOut, 0, 1));
  }
  return 1;
}

/**
 * Staggered fade-in: element appears after a delay (in seconds).
 */
export function staggeredEntry(
  localFrame: number,
  fps: number,
  delaySec: number,
  durationSec: number = 1.4
): number {
  const delay = sec(delaySec, fps);
  const dur = sec(durationSec, fps);
  const t = clamp((localFrame - delay) / dur, 0, 1);
  return easeOutCubic(t);
}
