import React from 'react';
import { Composition, staticFile } from 'remotion';
import { Movie, type MovieProps } from './components/Movie';
import { SubtitleEditor } from './components/SubtitleEditor';
import { BibleVerseLoader } from './components/BibleVerseLoader';
import { BgMusicUploader } from './components/BgMusicUploader';
import { BgVideoUploader } from './components/BgVideoUploader';
import { TOTAL_DURATION_FRAMES, FPS, SCENE_DURATION_FRAMES } from './styles/subtitle';
import { mergeSubtitles, type SubtitlesData } from './data/useSubtitles';
import { parseVerseRange, fetchBibleVerses } from './data/bibleApi';
import { generateScenes } from './data/sceneGenerator';
import type { Scene } from './data/scenes';
import type { CalculateMetadataFunction } from 'remotion';

// ── Load Google Fonts at module level ───────────────────────────
// These must load before rendering starts.
import { loadFont as loadFrankRuhlLibre } from '@remotion/google-fonts/FrankRuhlLibre';
import { loadFont as loadNotoSerifHebrew } from '@remotion/google-fonts/NotoSerifHebrew';
import { loadFont as loadNotoSerifKR } from '@remotion/google-fonts/NotoSerifKR';
import { loadFont as loadCormorantGaramond } from '@remotion/google-fonts/CormorantGaramond';

loadFrankRuhlLibre();
loadNotoSerifHebrew();
loadNotoSerifKR();
loadCormorantGaramond();


const calculateSubtitleMetadata: CalculateMetadataFunction<MovieProps> = async ({
  props,
}) => {
  let subtitleScenes;
  try {
    // public/subtitles.json 로드 (Studio & 렌더링 모두 동작)
    // cache: 'no-store' → reevaluateComposition() 후 항상 최신 파일을 가져옴
    const url = staticFile('subtitles.json') + '?t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data: SubtitlesData = await res.json();
      subtitleScenes = mergeSubtitles(data);
    }
  } catch {
    // fallback: use default SCENES (subtitleScenes = undefined)
  }
  return {
    props: {
      ...props,
      subtitleScenes,
    },
  };
};

/**
 * Dynamic Bible verse composition metadata calculator.
 * When verseRange is set (e.g. "Genesis 2:4 - 9:11"),
 * fetches WLC + KRV from Bolls.life API → generates scenes → sets duration.
 * Total capped at 10 minutes.
 */
async function calculateBibleVerseMetadata({
  props,
  abortSignal,
}: {
  props: Record<string, unknown>;
  abortSignal: AbortSignal;
  compositionId: string;
  defaultProps: Record<string, unknown>;
}) {
  // 1차: BibleVerseLoader에서 이미 scenes를 생성하여 props에 전달한 경우
  const existingScenes = props.subtitleScenes as Scene[] | undefined;
  const existingDuration = props.sceneDurationFrames as number | undefined;

  if (existingScenes && existingScenes.length > 0 && existingDuration) {
    return {
      durationInFrames: existingDuration * existingScenes.length,
      props: { ...props },
    };
  }

  // 2차: 저장된 bible-verse-data.json에서 로드 (CLI 렌더링용)
  try {
    const fileUrl = staticFile('bible-verse-data.json') + '?t=' + Date.now();
    const fileRes = await fetch(fileUrl, { cache: 'no-store' });
    if (fileRes.ok) {
      const saved = await fileRes.json();
      if (saved.scenes && saved.scenes.length > 0) {
        const duration = saved.sceneDurationFrames || SCENE_DURATION_FRAMES;
        return {
          durationInFrames: duration * saved.scenes.length,
          props: {
            ...props,
            subtitleScenes: saved.scenes,
            sceneDurationFrames: duration,
            verseRange: saved.verseRange || props.verseRange,
          },
        };
      }
    }
  } catch {
    // 파일 없으면 다음 단계로
  }

  // 3차: verseRange props로 직접 입력한 경우 API에서 fetch
  const verseRange = (props.verseRange as string) || '';

  if (!verseRange) {
    return { props: { ...props } };
  }

  try {
    const range = parseVerseRange(verseRange);
    const rawVerses = await fetchBibleVerses(range);

    if (abortSignal.aborted) throw new Error('Aborted');
    if (rawVerses.length === 0) throw new Error('No verses found');

    const rangeLabel = `${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse}`;
    const result = generateScenes(rawVerses, range.bookName, rangeLabel);

    const sceneDurationFrames = Math.round(result.sceneDurationSeconds * FPS);
    const totalFrames = sceneDurationFrames * result.scenes.length;

    return {
      durationInFrames: totalFrames,
      props: {
        ...props,
        subtitleScenes: result.scenes,
        sceneDurationFrames,
      },
    };
  } catch {
    return { props: { ...props } };
  }
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full 10-scene composition (720 seconds) */}
      <Composition
        id="GenesisSubtitles"
        component={Movie}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          bgVideoSrc: '',
          bgVideoOpacity: 1,
          bgMusicSrc: '',
          bgMusicVolume: 0.3,
          subtitleScenes: undefined,
        }}
        calculateMetadata={calculateSubtitleMetadata}
      />

      {/* Single scene preview (72 seconds) — useful for testing */}
      <Composition
        id="GenesisSubtitles-Preview"
        component={Movie}
        durationInFrames={2160}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          bgVideoSrc: '',
          bgVideoOpacity: 1,
          bgMusicSrc: '',
          bgMusicVolume: 0.3,
          subtitleScenes: undefined,
        }}
        calculateMetadata={calculateSubtitleMetadata}
      />

      {/* Dynamic Bible verse composition:
          Studio 왼쪽 사이드바에서 "BibleVerseSubtitles" 선택 →
          오른쪽 Props 패널에서 verseRange 입력 (예: "Genesis 2:4 - 9:11")
          → API에서 히브리어+한국어 자동 fetch → 10분 이내 자막 생성 */}
      <Composition
        id="BibleVerseSubtitles"
        component={Movie}
        durationInFrames={SCENE_DURATION_FRAMES * 10}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          bgVideoSrc: '',
          bgVideoOpacity: 1,
          bgMusicSrc: '',
          bgMusicVolume: 0.3,
          subtitleScenes: undefined,
          verseRange: '',
          sceneDurationFrames: SCENE_DURATION_FRAMES,
        }}
        calculateMetadata={calculateBibleVerseMetadata}
      />

      {/* Studio-only panels */}
      <SubtitleEditor />
      <BibleVerseLoader />
      <BgVideoUploader />
      <BgMusicUploader />
    </>
  );
};
