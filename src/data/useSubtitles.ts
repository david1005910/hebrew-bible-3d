import type { Scene } from './scenes';
import { SCENES } from './scenes';

/**
 * subtitles.json 의 구조
 */
export interface SubtitleVerse {
  korean?: string;
  highlightMean?: string;
}

export interface SubtitleScene {
  id: string;
  subtitle?: string;
  verses: SubtitleVerse[];
}

export interface SubtitlesData {
  scenes: SubtitleScene[];
}

/**
 * SCENES 기본값에 subtitles.json override를 머지한다.
 * override에 값이 있으면 그 값을 사용, 없으면 기존 SCENES 값 유지.
 */
export function mergeSubtitles(overrides: SubtitlesData | null): Scene[] {
  if (!overrides || !overrides.scenes) return SCENES;

  const overrideMap = new Map<string, SubtitleScene>();
  for (const s of overrides.scenes) {
    overrideMap.set(s.id, s);
  }

  return SCENES.map((scene) => {
    const ov = overrideMap.get(scene.id);
    if (!ov) return scene;

    return {
      ...scene,
      subtitle: ov.subtitle ?? scene.subtitle,
      verses: scene.verses.map((v, i) => {
        const vOv = ov.verses?.[i];
        if (!vOv) return v;
        return {
          ...v,
          korean: vOv.korean ?? v.korean,
          highlightMean: vOv.highlightMean ?? v.highlightMean,
        };
      }),
    };
  });
}
