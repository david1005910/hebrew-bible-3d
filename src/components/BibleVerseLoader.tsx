import React, { useState, useCallback } from 'react';
import { getRemotionEnvironment } from 'remotion';
import { parseVerseRange, fetchBibleVerses } from '../data/bibleApi';
import { generateScenes } from '../data/sceneGenerator';
import { setDynamicScenes } from '../data/dynamicScenes';
import { COLOR } from '../styles/subtitle';
import { FPS } from '../styles/subtitle';

/**
 * Studio 전용 구절 입력 패널.
 * 구절 범위를 입력하고 "불러오기" 버튼을 누르면
 * API fetch → Scene 생성 → BibleVerseSubtitles composition에 즉시 반영.
 */
export const BibleVerseLoader: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [verseRange, setVerseRange] = useState('Genesis 1:1 - 2:3');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{
    totalVerses: number;
    sceneCount: number;
    totalSeconds: number;
    versesPerScene: number;
  } | null>(null);

  const handleLoad = useCallback(async () => {
    if (!verseRange.trim()) {
      setStatus('구절 범위를 입력하세요');
      return;
    }

    setLoading(true);
    setStatus('API에서 불러오는 중...');
    setResult(null);

    try {
      const range = parseVerseRange(verseRange);
      setStatus(`${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse} 불러오는 중...`);

      const rawVerses = await fetchBibleVerses(range);
      if (rawVerses.length === 0) {
        setStatus('해당 범위에 구절이 없습니다.');
        setLoading(false);
        return;
      }

      setStatus(`${rawVerses.length}절 로드 완료. 장면 생성 중...`);

      const rangeLabel = `${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse}`;
      const generated = generateScenes(rawVerses, range.bookName, rangeLabel);

      const sceneDurationFrames = Math.round(generated.sceneDurationSeconds * FPS);

      // Studio API로 composition에 즉시 반영
      const { updateDefaultProps, reevaluateComposition } =
        await import('@remotion/studio');

      updateDefaultProps({
        compositionId: 'BibleVerseSubtitles',
        defaultProps: () => ({
          verseRange,
          bgVideoSrc: '',
          bgVideoOpacity: 1,
          subtitleScenes: generated.scenes,
          sceneDurationFrames,
        }),
      });

      reevaluateComposition();

      // 동적 장면을 공유 스토어에 저장 → SubtitleEditor에 반영
      setDynamicScenes(generated.scenes);

      setResult({
        totalVerses: generated.totalVerses,
        sceneCount: generated.scenes.length,
        totalSeconds: generated.totalDurationSeconds,
        versesPerScene: generated.versesPerScene,
      });

      const mins = Math.floor(generated.totalDurationSeconds / 60);
      const secs = Math.round(generated.totalDurationSeconds % 60);
      setStatus(`완료! ${generated.scenes.length}개 장면, ${mins}분 ${secs}초`);
    } catch (err) {
      setStatus(`오류: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [verseRange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        handleLoad();
      }
    },
    [handleLoad, loading],
  );

  // Studio 모드가 아니면 숨김
  try {
    if (!getRemotionEnvironment().isStudio) return null;
  } catch {
    return null;
  }

  if (!open) {
    return (
      <div style={toggleContainerStyle}>
        <button
          onClick={() => setOpen(true)}
          style={toggleBtnStyle}
          title="성경 구절 불러오기"
        >
          📖 구절불러오기
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>📖 성경 구절 불러오기</span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      {/* 입력 영역 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>구절 범위 입력</label>
        <input
          value={verseRange}
          onChange={(e) => setVerseRange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          placeholder="Genesis 2:4 - 9:11"
          disabled={loading}
        />
        <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
          예: Genesis 1:1 - 2:3 · 창세기 1:1 - 2:3 · Psalms 1:1 - 3:8
        </div>
      </div>

      {/* 불러오기 버튼 */}
      <div style={{ padding: '0 16px 12px' }}>
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{
            ...btnBase,
            width: '100%',
            background: loading ? '#555' : 'rgba(212,175,55,0.9)',
            color: '#000',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 0',
          }}
        >
          {loading ? '불러오는 중...' : '불러오기 (Enter)'}
        </button>
      </div>

      {/* 상태 메시지 */}
      {status && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: 12,
            color: status.includes('오류') ? '#f66' : status.includes('완료') ? '#6f6' : '#aaa',
            background: 'rgba(0,0,0,0.2)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {status}
        </div>
      )}

      {/* 결과 요약 */}
      {result && (
        <div style={resultStyle}>
          <div style={resultRow}>
            <span style={resultLabel}>총 구절</span>
            <span style={resultValue}>{result.totalVerses}절</span>
          </div>
          <div style={resultRow}>
            <span style={resultLabel}>장면 수</span>
            <span style={resultValue}>{result.sceneCount}개</span>
          </div>
          <div style={resultRow}>
            <span style={resultLabel}>장면당 구절</span>
            <span style={resultValue}>{result.versesPerScene}절</span>
          </div>
          <div style={resultRow}>
            <span style={resultLabel}>총 영상 길이</span>
            <span style={{ ...resultValue, color: COLOR.hebrew }}>
              {Math.floor(result.totalSeconds / 60)}분 {Math.round(result.totalSeconds % 60)}초
            </span>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div style={helpStyle}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>지원 책 이름:</div>
        <div>Genesis(창세기), Exodus(출애굽기), Psalms(시편), Isaiah(이사야), Proverbs(잠언) 등</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>사용법:</div>
        <div>1. 구절 범위 입력</div>
        <div>2. "불러오기" 클릭 (또는 Enter)</div>
        <div>3. 왼쪽에서 BibleVerseSubtitles 선택</div>
        <div>4. 미리보기에서 자막 확인</div>
      </div>
    </div>
  );
};

// ── 스타일 ──────────────────────────────────────────────

const toggleContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 70,
  right: 20,
  zIndex: 99998,
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '2px solid rgba(100,180,100,0.6)',
  background: 'rgba(60,140,60,0.9)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: 340,
  height: '100vh',
  background: '#1a1a1e',
  borderRight: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 99998,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: '#ddd',
  fontSize: 13,
  overflowY: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#ccc',
  fontSize: 14,
  cursor: 'pointer',
  padding: '4px 10px',
  borderRadius: 4,
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px 8px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#999',
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.08)',
  border: '2px solid rgba(212,175,55,0.4)',
  borderRadius: 6,
  color: '#eee',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.08)',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 12,
};

const resultStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(0,0,0,0.2)',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const resultRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
};

const resultLabel: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
};

const resultValue: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#ddd',
};

const helpStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 11,
  color: '#666',
  lineHeight: 1.6,
  marginTop: 'auto',
};
