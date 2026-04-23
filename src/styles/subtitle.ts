import React from 'react';

// ── 자막 모드 색상 (genesis-no-bg) ──────────────────────────────
export const COLOR = {
  text: '#f6f4ef',
  hebrew: '#4caf50', // 초록색
  muted: 'rgba(246, 244, 239, 0.55)',
  divider: 'rgba(246, 244, 239, 0.3)',
} as const;

// ── 텍스트 그림자 ──────────────────────────────────────────────
export const TEXT_SHADOW = {
  base: [
    '0 2px 8px rgba(0,0,0,0.95)',
    '0 4px 16px rgba(0,0,0,0.8)',
    '0 0 2px rgba(0,0,0,1)',
  ].join(', '),

  hebrew: [
    '0 2px 8px rgba(0,0,0,0.95)',
    '0 4px 16px rgba(0,0,0,0.8)',
    '0 0 18px rgba(76, 175, 80, 0.4)',
    '0 0 2px rgba(0,0,0,1)',
  ].join(', '),
} as const;

// ── 폰트 패밀리 ────────────────────────────────────────────────
export const FONT = {
  hebrew: "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'David', serif",
  korean: "'Noto Serif KR', serif",
  latin: "'Cormorant Garamond', Georgia, serif",
  mono: "JetBrains Mono, ui-monospace, monospace",
} as const;

// ── 기본 자막 텍스트 스타일 ────────────────────────────────────
export const baseTextStyle: React.CSSProperties = {
  color: COLOR.text,
  textShadow: TEXT_SHADOW.base,
};

export const hebrewTextStyle: React.CSSProperties = {
  color: COLOR.hebrew,
  textShadow: TEXT_SHADOW.hebrew,
  fontFamily: FONT.hebrew,
  direction: 'rtl' as const,
};

export const koreanTextStyle: React.CSSProperties = {
  color: COLOR.text,
  textShadow: TEXT_SHADOW.base,
  fontFamily: FONT.korean,
};

export const latinTextStyle: React.CSSProperties = {
  color: COLOR.text,
  textShadow: TEXT_SHADOW.base,
  fontFamily: FONT.latin,
};

// ── 레이아웃 상수 (1920×1080 기준) ─────────────────────────────
export const SCENE_DURATION_SEC = 72;
export const FPS = 30;
export const SCENE_DURATION_FRAMES = SCENE_DURATION_SEC * FPS; // 2160
export const TOTAL_SCENES = 10;
export const TOTAL_DURATION_FRAMES = SCENE_DURATION_FRAMES * TOTAL_SCENES; // 21600
