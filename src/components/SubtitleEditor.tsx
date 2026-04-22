import React, { useState, useCallback, useEffect } from 'react';
import { getRemotionEnvironment, staticFile } from 'remotion';
import { SCENES } from '../data/scenes';
import type { Scene } from '../data/scenes';
import { COLOR } from '../styles/subtitle';
import { mergeSubtitles, type SubtitlesData } from '../data/useSubtitles';
import {
  getDynamicScenes,
  subscribeDynamicScenes,
} from '../data/dynamicScenes';

/**
 * Remotion Studio 메인 페이지에 렌더링되는 자막 편집 패널.
 * 동적 장면이 로드되면 자동으로 전환하여 편집 가능.
 */
export const SubtitleEditor: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);

  // 동적 장면 구독
  const [dynamicScenes, setDynScenes] = useState<Scene[] | null>(
    getDynamicScenes,
  );

  useEffect(() => {
    return subscribeDynamicScenes(() => {
      setDynScenes(getDynamicScenes());
    });
  }, []);

  // 현재 활성 장면 배열: 동적 장면이 있으면 그것을 사용
  const activeScenes = dynamicScenes ?? SCENES;
  const isDynamic = dynamicScenes !== null;

  // 편집 state — activeScenes가 바뀌면 재초기화
  const [editData, setEditData] = useState<SubtitlesData>(() =>
    buildEditData(activeScenes),
  );

  // 동적 장면이 로드되면 editData 재초기화 + sceneIndex 리셋
  useEffect(() => {
    setEditData(buildEditData(activeScenes));
    setSceneIndex(0);
  }, [dynamicScenes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 저장된 subtitles.json 로드 → 편집기 초기값 반영 (기본 장면 모드만)
  useEffect(() => {
    if (isDynamic) return; // 동적 모드에서는 subtitles.json 로드 불필요
    const url = staticFile('subtitles.json') + '?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: SubtitlesData) => {
        if (!data?.scenes) return;
        const overrideMap = new Map(data.scenes.map((s) => [s.id, s]));
        setEditData({
          scenes: SCENES.map((s) => {
            const ov = overrideMap.get(s.id);
            return {
              id: s.id,
              subtitle: ov?.subtitle ?? s.subtitle,
              verses: s.verses.map((v, i) => ({
                korean: ov?.verses?.[i]?.korean ?? v.korean,
                highlightMean: ov?.verses?.[i]?.highlightMean ?? v.highlightMean,
              })),
            };
          }),
        });
      })
      .catch(() => {});
  }, [isDynamic]);

  // 안전한 인덱스 clamp
  const safeIndex = Math.min(sceneIndex, activeScenes.length - 1);
  const scene = activeScenes[safeIndex];
  const editScene = editData.scenes[safeIndex];

  // 필드 업데이트
  const updateSubtitle = useCallback(
    (value: string) => {
      setEditData((prev) => {
        const next = { ...prev, scenes: [...prev.scenes] };
        next.scenes[safeIndex] = {
          ...next.scenes[safeIndex],
          subtitle: value,
        };
        return next;
      });
    },
    [safeIndex],
  );

  const updateVerse = useCallback(
    (vi: number, field: 'korean' | 'highlightMean', value: string) => {
      setEditData((prev) => {
        const next = { ...prev, scenes: [...prev.scenes] };
        const s = { ...next.scenes[safeIndex] };
        s.verses = [...s.verses];
        s.verses[vi] = { ...s.verses[vi], [field]: value };
        next.scenes[safeIndex] = s;
        return next;
      });
    },
    [safeIndex],
  );

  // 저장
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const { writeStaticFile, updateDefaultProps, reevaluateComposition } =
        await import('@remotion/studio');
      const json = JSON.stringify(editData, null, 2);
      await writeStaticFile({
        filePath: isDynamic ? 'bible-subtitles.json' : 'subtitles.json',
        contents: json,
      });

      if (isDynamic) {
        // 동적 모드: 편집된 한국어를 장면에 머지 → BibleVerseSubtitles에 반영
        const editMap = new Map(editData.scenes.map((s) => [s.id, s]));
        const merged = activeScenes.map((s) => {
          const ov = editMap.get(s.id);
          if (!ov) return s;
          return {
            ...s,
            subtitle: ov.subtitle ?? s.subtitle,
            verses: s.verses.map((v, i) => {
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
        try {
          updateDefaultProps({
            compositionId: 'BibleVerseSubtitles',
            defaultProps: (prev) => ({
              ...prev.savedDefaultProps,
              subtitleScenes: merged,
            }),
          });
        } catch {
          // composition 없으면 무시
        }
      } else {
        // 기본 모드: GenesisSubtitles에 반영
        const merged = mergeSubtitles(editData);
        for (const compositionId of [
          'GenesisSubtitles',
          'GenesisSubtitles-Preview',
        ]) {
          try {
            updateDefaultProps({
              compositionId,
              defaultProps: ({ savedDefaultProps }) => ({
                ...savedDefaultProps,
                subtitleScenes: merged,
              }),
            });
          } catch {
            // composition 없으면 무시
          }
        }
      }

      reevaluateComposition();
      setSaveMsg('저장 완료!');
    } catch (err) {
      setSaveMsg('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [editData, isDynamic, activeScenes]);

  // JSON 다운로드
  const handleDownload = useCallback(() => {
    const json = JSON.stringify(editData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDynamic ? 'bible-subtitles.json' : 'subtitles.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [editData, isDynamic]);

  // Studio 모드가 아니면 숨김
  try {
    if (!getRemotionEnvironment().isStudio) return null;
  } catch {
    return null;
  }

  // ── 닫힌 상태: 토글 버튼만 ──
  if (!open) {
    return (
      <div style={toggleContainerStyle}>
        <button
          onClick={() => setOpen(true)}
          style={toggleBtnStyle}
          title="자막 편집기 열기"
        >
          ✏ 자막편집
        </button>
      </div>
    );
  }

  if (!scene || !editScene) return null;

  // ── 열린 상태: 편집 패널 ──
  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {isDynamic ? '📖 구절 자막 편집' : '자막 편집'}
        </span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>
          ✕ 닫기
        </button>
      </div>

      {/* 동적 모드 표시 */}
      {isDynamic && (
        <div
          style={{
            padding: '6px 16px',
            fontSize: 11,
            color: '#6f6',
            background: 'rgba(60,140,60,0.15)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          동적 구절 모드 — {activeScenes.length}개 장면
        </div>
      )}

      {/* 장면 네비게이션 */}
      <div style={navStyle}>
        <button
          onClick={() => setSceneIndex((i) => Math.max(0, i - 1))}
          disabled={safeIndex === 0}
          style={navBtnStyle}
        >
          ◀ 이전
        </button>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {safeIndex + 1} / {activeScenes.length}
        </span>
        <button
          onClick={() =>
            setSceneIndex((i) => Math.min(activeScenes.length - 1, i + 1))
          }
          disabled={safeIndex === activeScenes.length - 1}
          style={navBtnStyle}
        >
          다음 ▶
        </button>
      </div>

      {/* 장면 퀵 점프 */}
      <div style={quickNavStyle}>
        {activeScenes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSceneIndex(i)}
            style={{
              ...quickBtnStyle,
              background:
                i === safeIndex
                  ? 'rgba(212,175,55,0.8)'
                  : 'rgba(255,255,255,0.06)',
              color: i === safeIndex ? '#000' : '#aaa',
              fontWeight: i === safeIndex ? 700 : 400,
            }}
            title={s.titleKr || s.subtitle}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* 장면 정보 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>
          {scene.id} — {scene.chapter}
        </div>
        <div style={hebrewReadonly}>{scene.title}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
          {scene.titleKr}
        </div>
      </div>

      {/* subtitle */}
      <div style={sectionStyle}>
        <label style={labelStyle}>subtitle (부제)</label>
        <input
          value={editScene.subtitle ?? ''}
          onChange={(e) => updateSubtitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* 스크롤 영역: 절별 편집 */}
      <div style={scrollAreaStyle}>
        {scene.verses.map((v, vi) => (
          <div key={vi} style={verseBlockStyle}>
            <div style={verseDividerStyle}>
              {v.ref ? `── ${v.ref} ──` : `── 절 ${vi + 1} ──`}
            </div>

            {/* 히브리어 원문 (읽기 전용) */}
            <div style={hebrewSmallStyle} dir="rtl">
              {v.hebrew}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              {v.translit}
            </div>

            {/* korean */}
            <label style={labelStyle}>한국어</label>
            <textarea
              value={editScene.verses[vi]?.korean ?? ''}
              onChange={(e) => updateVerse(vi, 'korean', e.target.value)}
              style={textareaStyle}
              rows={2}
            />

            {/* highlightMean */}
            {v.highlight && (
              <>
                <label style={labelStyle}>
                  키워드 뜻{' '}
                  <span style={{ color: COLOR.hebrew }}>{v.highlight}</span>
                </label>
                <input
                  value={editScene.verses[vi]?.highlightMean ?? ''}
                  onChange={(e) =>
                    updateVerse(vi, 'highlightMean', e.target.value)
                  }
                  style={inputStyle}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
      <div style={footerStyle}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnBase,
            flex: 1,
            background: saving ? '#555' : 'rgba(212,175,55,0.9)',
            color: '#000',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={handleDownload} style={{ ...btnBase, fontSize: 13 }}>
          JSON 다운
        </button>
      </div>

      {/* 저장 메시지 */}
      {saveMsg && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: 12,
            textAlign: 'center',
            color: saveMsg.includes('실패') ? '#f66' : '#6f6',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {saveMsg}
        </div>
      )}
    </div>
  );
};

// ── 헬퍼 ──────────────────────────────────────────────

function buildEditData(scenes: Scene[]): SubtitlesData {
  return {
    scenes: scenes.map((s) => ({
      id: s.id,
      subtitle: s.subtitle,
      verses: s.verses.map((v) => ({
        korean: v.korean,
        highlightMean: v.highlightMean,
      })),
    })),
  };
}

// ── 스타일 ──────────────────────────────────────────────

const PANEL_WIDTH = 350;

const toggleContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 99999,
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '2px solid rgba(212,175,55,0.6)',
  background: 'rgba(212,175,55,0.9)',
  color: '#000',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: PANEL_WIDTH,
  height: '100vh',
  background: '#1a1a1e',
  borderLeft: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 99999,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: '#ddd',
  fontSize: 13,
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
  fontSize: 12,
  cursor: 'pointer',
  padding: '4px 10px',
  borderRadius: 4,
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const navBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#ccc',
  borderRadius: 4,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
};

const quickNavStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '8px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexWrap: 'wrap',
};

const quickBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const sectionStyle: React.CSSProperties = {
  padding: '10px 16px 6px',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '0 16px 12px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#999',
  marginBottom: 4,
  marginTop: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  color: '#eee',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical' as const,
  lineHeight: 1.6,
};

const hebrewReadonly: React.CSSProperties = {
  direction: 'rtl',
  fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
  color: COLOR.hebrew,
  fontSize: 20,
  padding: '4px 0',
};

const hebrewSmallStyle: React.CSSProperties = {
  fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
  color: COLOR.hebrew,
  fontSize: 14,
  lineHeight: 1.5,
  opacity: 0.85,
};

const verseBlockStyle: React.CSSProperties = {
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const verseDividerStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  textAlign: 'center',
  margin: '12px 0 8px',
  letterSpacing: 1,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '10px 16px',
  borderTop: '1px solid rgba(255,255,255,0.1)',
};

const btnBase: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.08)',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 12,
};
