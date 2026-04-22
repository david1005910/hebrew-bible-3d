import type { Scene } from './scenes';

/**
 * BibleVerseLoader ↔ SubtitleEditor 간 동적 장면 공유 스토어.
 * 모듈 레벨 상태 + 구독 패턴.
 */

let _scenes: Scene[] | null = null;
const _listeners = new Set<() => void>();

export function setDynamicScenes(scenes: Scene[]) {
  _scenes = scenes;
  _listeners.forEach((fn) => fn());
}

export function getDynamicScenes(): Scene[] | null {
  return _scenes;
}

export function subscribeDynamicScenes(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}
