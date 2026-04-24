import React, { useState, useCallback, useEffect } from 'react';
import { getRemotionEnvironment, staticFile } from 'remotion';
import { parseVerseRange, fetchBibleVerses } from '../data/bibleApi';
import { generateScenes } from '../data/sceneGenerator';
import { setDynamicScenes } from '../data/dynamicScenes';
import { translateHebrewBatch, API_PRESETS } from '../data/hebrewTranslator';
import type { TranslationConfig } from '../data/hebrewTranslator';
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

  // 번역 모드: 'krv' = 개역한글 (기존), 'ai' = AI 직역
  const [translationMode, setTranslationMode] = useState<'krv' | 'ai'>('krv');
  const [apiKey, setApiKey] = useState('');
  const [apiPreset, setApiPreset] = useState(0); // API_PRESETS index
  const [showApiConfig, setShowApiConfig] = useState(false);

  // 저장된 구절 범위 목록
  type SavedRange = { range: string; label: string; date: string };
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([]);

  // 초기 로드: 저장된 구절 범위 + API 설정 불러오기
  useEffect(() => {
    const url = staticFile('saved-verse-ranges.json') + '?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: SavedRange[]) => {
        if (Array.isArray(data)) setSavedRanges(data);
      })
      .catch(() => {});

    // API 키 불러오기
    const apiUrl = staticFile('ai-config.json') + '?t=' + Date.now();
    fetch(apiUrl, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: { apiKey?: string; preset?: number; mode?: string }) => {
        if (data.apiKey) setApiKey(data.apiKey);
        if (typeof data.preset === 'number') setApiPreset(data.preset);
        if (data.mode === 'ai') setTranslationMode('ai');
      })
      .catch(() => {});
  }, []);

  // API 설정 저장
  const saveApiConfig = useCallback(async () => {
    try {
      const { writeStaticFile } = await import('@remotion/studio');
      await writeStaticFile({
        filePath: 'ai-config.json',
        contents: JSON.stringify({
          apiKey,
          preset: apiPreset,
          mode: translationMode,
        }),
      });
      setStatus('API 설정 저장 완료');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('API 설정 저장 실패');
      setTimeout(() => setStatus(''), 2000);
    }
  }, [apiKey, apiPreset, translationMode]);

  // 구절 범위 저장
  const handleSaveRange = useCallback(async () => {
    if (!verseRange.trim()) return;
    try {
      const range = parseVerseRange(verseRange);
      const label = `${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse}`;
      const newEntry: SavedRange = {
        range: verseRange.trim(),
        label,
        date: new Date().toISOString().slice(0, 10),
      };
      // 중복 제거 후 앞에 추가
      const updated = [
        newEntry,
        ...savedRanges.filter((r) => r.range !== verseRange.trim()),
      ];
      setSavedRanges(updated);

      const { writeStaticFile } = await import('@remotion/studio');
      await writeStaticFile({
        filePath: 'saved-verse-ranges.json',
        contents: JSON.stringify(updated, null, 2),
      });
      setStatus('구절 범위 저장 완료');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setStatus(`저장 오류: ${(err as Error).message}`);
    }
  }, [verseRange, savedRanges]);

  // 저장된 구절 범위 삭제
  const handleDeleteRange = useCallback(
    async (idx: number) => {
      const updated = savedRanges.filter((_, i) => i !== idx);
      setSavedRanges(updated);
      try {
        const { writeStaticFile } = await import('@remotion/studio');
        await writeStaticFile({
          filePath: 'saved-verse-ranges.json',
          contents: JSON.stringify(updated, null, 2),
        });
      } catch {
        // 무시
      }
    },
    [savedRanges],
  );

  const handleLoad = useCallback(async () => {
    if (!verseRange.trim()) {
      setStatus('구절 범위를 입력하세요');
      return;
    }

    if (translationMode === 'ai' && !apiKey.trim()) {
      setStatus('AI 번역 모드: API 키를 입력하세요');
      setShowApiConfig(true);
      return;
    }

    setLoading(true);
    setStatus('API에서 불러오는 중...');
    setResult(null);

    try {
      const range = parseVerseRange(verseRange);
      setStatus(`${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse} 불러오는 중...`);

      // 히브리어 원문 fetch (AI 모드면 KRV 스킵)
      const fetchMode = translationMode === 'ai' ? 'hebrew-only' : 'krv';
      const rawVerses = await fetchBibleVerses(range, fetchMode);
      if (rawVerses.length === 0) {
        setStatus('해당 범위에 구절이 없습니다.');
        setLoading(false);
        return;
      }

      // AI 번역 모드: 히브리어 → 한국어 직역
      if (translationMode === 'ai') {
        setStatus(`${rawVerses.length}절 로드 완료. AI 번역 중...`);

        const preset = API_PRESETS[apiPreset] || API_PRESETS[0];
        const config: TranslationConfig = {
          apiKey: apiKey.trim(),
          apiUrl: preset.apiUrl,
          model: preset.model,
        };

        const versesForTranslation = rawVerses.map((rv) => ({
          ref: `${rv.chapter}:${rv.verse}`,
          hebrew: rv.hebrew,
        }));

        const translations = await translateHebrewBatch(
          versesForTranslation,
          config,
          (done, total) => {
            setStatus(`AI 번역 중... ${done}/${total}절`);
          },
        );

        // 번역 결과를 rawVerses에 적용
        for (let i = 0; i < rawVerses.length; i++) {
          rawVerses[i].korean = translations[i] || rawVerses[i].korean;
        }
      }

      setStatus(`${rawVerses.length}절 ${translationMode === 'ai' ? '번역' : '로드'} 완료. 장면 생성 중...`);

      const rangeLabel = `${range.bookName} ${range.startChapter}:${range.startVerse} – ${range.endChapter}:${range.endVerse}`;
      const generated = generateScenes(rawVerses, range.bookName, rangeLabel);

      const sceneDurationFrames = Math.round(generated.sceneDurationSeconds * FPS);

      // Studio API로 composition에 즉시 반영
      const { updateDefaultProps, reevaluateComposition, writeStaticFile } =
        await import('@remotion/studio');

      // 1. CLI 렌더링용 파일을 먼저 저장 (calculateMetadata에서 참조)
      try {
        await writeStaticFile({
          filePath: 'bible-verse-data.json',
          contents: JSON.stringify({
            verseRange,
            scenes: generated.scenes,
            sceneDurationFrames,
          }, null, 2),
        });
      } catch {
        // 저장 실패해도 Studio 동작에는 영향 없음
      }

      // 2. 동적 장면을 공유 스토어에 저장 → SubtitleEditor에 반영
      setDynamicScenes(generated.scenes);

      // 3. BibleVerseSubtitles composition의 props 업데이트
      //    prev.unsavedDefaultProps를 사용해 기존 설정(배경영상, 음악 등)을 유지
      updateDefaultProps({
        compositionId: 'BibleVerseSubtitles',
        defaultProps: (prev) => ({
          ...prev.unsavedDefaultProps,
          verseRange,
          subtitleScenes: generated.scenes,
          sceneDurationFrames,
        }),
      });

      // 4. BibleVerseSubtitles composition으로 자동 전환 + re-evaluate
      //    Studio 내부의 popstate 리스너가 URL 변경을 감지하여 composition을 전환함
      try {
        window.history.pushState({}, 'Studio', '/BibleVerseSubtitles');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        // URL 전환 실패 시 무시
      }

      // composition 전환 후 calculateMetadata 실행을 위해 약간의 지연
      setTimeout(() => {
        try { reevaluateComposition(); } catch { /* 무시 */ }
      }, 300);

      setResult({
        totalVerses: generated.totalVerses,
        sceneCount: generated.scenes.length,
        totalSeconds: generated.totalDurationSeconds,
        versesPerScene: generated.versesPerScene,
      });

      const mins = Math.floor(generated.totalDurationSeconds / 60);
      const secs = Math.round(generated.totalDurationSeconds % 60);
      const modeLabel = translationMode === 'ai' ? '(AI 직역)' : '(개역한글)';
      setStatus(`완료! ${generated.scenes.length}개 장면, ${mins}분 ${secs}초 ${modeLabel}`);
    } catch (err) {
      setStatus(`오류: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [verseRange, translationMode, apiKey, apiPreset]);

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

      {/* 번역 모드 선택 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>번역 소스</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTranslationMode('krv')}
            style={{
              ...modeBtnStyle,
              background:
                translationMode === 'krv'
                  ? 'rgba(212,175,55,0.3)'
                  : 'rgba(255,255,255,0.04)',
              borderColor:
                translationMode === 'krv'
                  ? 'rgba(212,175,55,0.6)'
                  : 'rgba(255,255,255,0.1)',
              color: translationMode === 'krv' ? COLOR.hebrew : '#888',
            }}
          >
            개역한글 (KRV)
          </button>
          <button
            onClick={() => {
              setTranslationMode('ai');
              if (!apiKey) setShowApiConfig(true);
            }}
            style={{
              ...modeBtnStyle,
              background:
                translationMode === 'ai'
                  ? 'rgba(100,160,250,0.25)'
                  : 'rgba(255,255,255,0.04)',
              borderColor:
                translationMode === 'ai'
                  ? 'rgba(100,160,250,0.6)'
                  : 'rgba(255,255,255,0.1)',
              color: translationMode === 'ai' ? '#6af' : '#888',
            }}
          >
            AI 직역
          </button>
        </div>
        {translationMode === 'ai' && (
          <div style={{ fontSize: 11, color: '#6af', marginTop: 4 }}>
            히브리어 원문을 AI가 직접 한국어로 번역합니다
          </div>
        )}
      </div>

      {/* AI API 설정 (AI 모드 선택 시) */}
      {translationMode === 'ai' && (
        <div style={apiSectionStyle}>
          <button
            onClick={() => setShowApiConfig((v) => !v)}
            style={{
              ...replaceToggleStyle,
              color: apiKey ? '#6f6' : '#f90',
            }}
          >
            {showApiConfig ? '▾' : '▸'} API 설정
            {apiKey ? ' (설정됨)' : ' (필요)'}
          </button>
          {showApiConfig && (
            <div style={{ padding: '8px 16px 10px' }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>API 프리셋</label>
              <select
                value={apiPreset}
                onChange={(e) => setApiPreset(Number(e.target.value))}
                style={{
                  ...selectStyle,
                  marginBottom: 8,
                }}
              >
                {API_PRESETS.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label style={{ ...labelStyle, fontSize: 11 }}>API 키</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }}
                placeholder="sk-... 또는 API 키 입력"
              />

              <button
                onClick={saveApiConfig}
                style={{
                  ...btnBase,
                  marginTop: 8,
                  fontSize: 11,
                  padding: '5px 12px',
                  background: 'rgba(100,160,250,0.3)',
                }}
              >
                API 설정 저장
              </button>
            </div>
          )}
        </div>
      )}

      {/* 불러오기 + 저장 버튼 */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{
            ...btnBase,
            flex: 1,
            background: loading ? '#555' : 'rgba(212,175,55,0.9)',
            color: '#000',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 0',
          }}
        >
          {loading ? '불러오는 중...' : '불러오기 (Enter)'}
        </button>
        <button
          onClick={handleSaveRange}
          disabled={loading || !verseRange.trim()}
          style={{
            ...btnBase,
            background: 'rgba(100,180,100,0.85)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            padding: '10px 16px',
          }}
        >
          저장
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

      {/* 저장된 구절 목록 */}
      {savedRanges.length > 0 && (
        <div style={savedSectionStyle}>
          <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 8 }}>
            저장된 구절 ({savedRanges.length})
          </div>
          {savedRanges.map((item, idx) => (
            <div key={idx} style={savedRowStyle}>
              <button
                onClick={() => setVerseRange(item.range)}
                style={savedRangeBtnStyle}
                title={item.range}
              >
                <span style={{ color: COLOR.hebrew, fontWeight: 600 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 10, color: '#666' }}>{item.date}</span>
              </button>
              <button
                onClick={() => handleDeleteRange(idx)}
                style={savedDeleteBtnStyle}
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      <div style={helpStyle}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>지원 책 이름:</div>
        <div>Genesis(창세기), Exodus(출애굽기), Psalms(시편), Isaiah(이사야), Proverbs(잠언) 등</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>사용법:</div>
        <div>1. 번역 소스 선택 (개역한글 또는 AI 직역)</div>
        <div>2. AI 직역 선택 시 API 키 설정</div>
        <div>3. 구절 범위 입력</div>
        <div>4. "불러오기" 클릭 (또는 Enter)</div>
        <div>5. 왼쪽에서 BibleVerseSubtitles 선택</div>
        <div>6. 미리보기에서 자막 확인</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>번역 모드:</div>
        <div>• 개역한글: 기존 한글 성경(KRV) 사용</div>
        <div>• AI 직역: 히브리어 원문을 AI가 직접 번역</div>
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

const savedSectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const savedRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 4,
  alignItems: 'center',
};

const savedRangeBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 10px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 4,
  color: '#ccc',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
};

const savedDeleteBtnStyle: React.CSSProperties = {
  background: 'rgba(255,80,80,0.1)',
  border: '1px solid rgba(255,80,80,0.2)',
  color: '#f66',
  borderRadius: 4,
  width: 24,
  height: 24,
  cursor: 'pointer',
  fontSize: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const modeBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  border: '1px solid',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
  background: 'rgba(255,255,255,0.04)',
};

const apiSectionStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const replaceToggleStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 16px',
  background: 'none',
  border: 'none',
  color: '#aaa',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: '#2a2a30',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  color: '#eee',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const helpStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 11,
  color: '#666',
  lineHeight: 1.6,
  marginTop: 'auto',
};
