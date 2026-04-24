import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getRemotionEnvironment, staticFile } from 'remotion';
import { SCENES } from '../data/scenes';
import type { Scene } from '../data/scenes';
import { COLOR } from '../styles/subtitle';
import { mergeSubtitles, type SubtitlesData } from '../data/useSubtitles';
import {
  getDynamicScenes,
  setDynamicScenes,
  subscribeDynamicScenes,
} from '../data/dynamicScenes';

/**
 * Remotion Studio 메인 페이지에 렌더링되는 자막 편집 패널.
 * 동적 장면이 로드되면 자동으로 전환하여 편집 가능.
 */
export const SubtitleEditor: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);

  // 단어 치환 (다중 규칙)
  type ReplaceRule = { find: string; replace: string };
  const [replaceRules, setReplaceRules] = useState<ReplaceRule[]>([
    { find: '', replace: '' },
  ]);
  const [replaceMsg, setReplaceMsg] = useState('');
  const [replaceOpen, setReplaceOpen] = useState(false);

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

  // 치환 규칙 관리
  const addRule = useCallback(() => {
    setReplaceRules((prev) => [...prev, { find: '', replace: '' }]);
  }, []);

  const removeRule = useCallback((idx: number) => {
    setReplaceRules((prev) => {
      if (prev.length <= 1) return [{ find: '', replace: '' }];
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const updateRule = useCallback(
    (idx: number, field: 'find' | 'replace', value: string) => {
      setReplaceRules((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  // 일치 건수 미리보기 (모든 규칙 합산)
  const matchPreview = useMemo(() => {
    const activeRules = replaceRules.filter((r) => r.find);
    if (activeRules.length === 0) return { total: 0, current: 0 };

    let total = 0;
    let current = 0;
    editData.scenes.forEach((s, i) => {
      let sceneCount = 0;
      for (const rule of activeRules) {
        const escaped = rule.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        sceneCount += (s.subtitle?.match(regex) || []).length;
        s.verses.forEach((v) => {
          sceneCount += (v.korean?.match(regex) || []).length;
          sceneCount += (v.highlightMean?.match(regex) || []).length;
        });
      }
      total += sceneCount;
      if (i === safeIndex) current = sceneCount;
    });
    return { total, current };
  }, [replaceRules, editData, safeIndex]);

  // 단어 치환 실행 (전체 또는 현재 장면만, 모든 규칙 적용)
  const handleReplace = useCallback(
    (scope: 'all' | 'current') => {
      const activeRules = replaceRules.filter((r) => r.find);
      if (activeRules.length === 0) return;

      let count = 0;
      const applyRules = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = text;
        for (const rule of activeRules) {
          const escaped = rule.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'g');
          const matches = result.match(regex);
          if (matches) count += matches.length;
          result = result.split(rule.find).join(rule.replace);
        }
        return result;
      };

      setEditData((prev) => ({
        scenes: prev.scenes.map((s, i) => {
          if (scope === 'current' && i !== safeIndex) return s;
          return {
            ...s,
            subtitle: applyRules(s.subtitle),
            verses: s.verses.map((v) => ({
              ...v,
              korean: applyRules(v.korean),
              highlightMean: applyRules(v.highlightMean),
            })),
          };
        }),
      }));

      const label = scope === 'current' ? '현재 장면' : '전체';
      setReplaceMsg(
        count > 0 ? `${label}: ${count}건 치환 완료` : '일치 항목 없음',
      );
      setTimeout(() => setReplaceMsg(''), 3000);
    },
    [replaceRules, safeIndex],
  );

  // 치환 규칙 저장/불러오기
  const saveRules = useCallback(async () => {
    try {
      const { writeStaticFile } = await import('@remotion/studio');
      const activeRules = replaceRules.filter((r) => r.find);
      await writeStaticFile({
        filePath: 'replace-rules.json',
        contents: JSON.stringify(activeRules, null, 2),
      });
      setReplaceMsg(`${activeRules.length}개 규칙 저장 완료`);
      setTimeout(() => setReplaceMsg(''), 3000);
    } catch {
      setReplaceMsg('규칙 저장 실패');
      setTimeout(() => setReplaceMsg(''), 3000);
    }
  }, [replaceRules]);

  const loadRules = useCallback(() => {
    const url = staticFile('replace-rules.json') + '?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: ReplaceRule[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setReplaceRules(data);
          setReplaceMsg(`${data.length}개 규칙 불러옴`);
        } else {
          setReplaceMsg('저장된 규칙 없음');
        }
        setTimeout(() => setReplaceMsg(''), 3000);
      })
      .catch(() => {
        setReplaceMsg('저장된 규칙 없음');
        setTimeout(() => setReplaceMsg(''), 3000);
      });
  }, []);

  // 초기 로드 시 저장된 규칙 불러오기
  useEffect(() => {
    const url = staticFile('replace-rules.json') + '?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: ReplaceRule[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setReplaceRules(data);
        }
      })
      .catch(() => {});
  }, []);

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
          // 현재 런타임 props를 유지하면서 subtitleScenes만 교체
          updateDefaultProps({
            compositionId: 'BibleVerseSubtitles',
            defaultProps: (prev) => ({
              ...prev.unsavedDefaultProps,
              subtitleScenes: merged,
            }),
          });
        } catch {
          // composition 없으면 무시
        }

        // 공유 스토어 업데이트 → SubtitleEditor/다른 컴포넌트에도 반영
        setDynamicScenes(merged);

        // CLI 렌더링용 파일도 업데이트 (기존 sceneDurationFrames 유지)
        try {
          let existingDuration: number | undefined;
          try {
            const res = await fetch(
              staticFile('bible-verse-data.json') + '?t=' + Date.now(),
              { cache: 'no-store' },
            );
            if (res.ok) {
              const data = await res.json();
              existingDuration = data.sceneDurationFrames;
            }
          } catch { /* 무시 */ }
          await writeStaticFile({
            filePath: 'bible-verse-data.json',
            contents: JSON.stringify({
              scenes: merged,
              sceneDurationFrames: existingDuration,
            }, null, 2),
          });
        } catch {
          // 무시
        }

        // 현재 composition re-evaluate
        try { reevaluateComposition(); } catch { /* 무시 */ }
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

      {/* 단어 치환 섹션 */}
      <div style={replaceSectionStyle}>
        <button
          onClick={() => setReplaceOpen((v) => !v)}
          style={replaceToggleStyle}
        >
          {replaceOpen ? '▾' : '▸'} 단어 치환
          {matchPreview.total > 0 && (
            <span style={{ color: '#6cf', marginLeft: 6 }}>
              ({matchPreview.total})
            </span>
          )}
          {replaceRules.filter((r) => r.find).length > 0 && (
            <span style={{ color: '#999', marginLeft: 4 }}>
              [{replaceRules.filter((r) => r.find).length}규칙]
            </span>
          )}
        </button>
        {replaceOpen && (
          <div style={{ padding: '8px 16px 10px' }}>
            {/* 규칙 목록 */}
            {replaceRules.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 4,
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: 1 }}>
                  {idx === 0 && (
                    <label style={{ ...labelStyle, marginTop: 0 }}>
                      찾을 단어
                    </label>
                  )}
                  <input
                    value={rule.find}
                    onChange={(e) => updateRule(idx, 'find', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReplace('all');
                    }}
                    style={{ ...inputStyle, fontSize: 12, padding: '5px 8px' }}
                    placeholder="찾기"
                  />
                </div>
                <div style={{ fontSize: 11, color: '#666', padding: '6px 0' }}>
                  →
                </div>
                <div style={{ flex: 1 }}>
                  {idx === 0 && (
                    <label style={{ ...labelStyle, marginTop: 0 }}>
                      바꿀 단어
                    </label>
                  )}
                  <input
                    value={rule.replace}
                    onChange={(e) => updateRule(idx, 'replace', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReplace('all');
                    }}
                    style={{ ...inputStyle, fontSize: 12, padding: '5px 8px' }}
                    placeholder="바꾸기"
                  />
                </div>
                <button
                  onClick={() => removeRule(idx)}
                  style={ruleRemoveBtnStyle}
                  title="규칙 삭제"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* 규칙 추가 버튼 */}
            <button onClick={addRule} style={ruleAddBtnStyle}>
              + 규칙 추가
            </button>

            {/* 일치 건수 미리보기 */}
            {matchPreview.total > 0 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                전체 {matchPreview.total}건 / 현재 장면 {matchPreview.current}건
                일치
              </div>
            )}

            {/* 치환 실행 버튼 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => handleReplace('all')}
                disabled={!replaceRules.some((r) => r.find)}
                style={{
                  ...btnBase,
                  background: replaceRules.some((r) => r.find)
                    ? 'rgba(100,160,250,0.9)'
                    : 'rgba(100,160,250,0.3)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                전체 치환
              </button>
              <button
                onClick={() => handleReplace('current')}
                disabled={!replaceRules.some((r) => r.find)}
                style={{
                  ...btnBase,
                  background: replaceRules.some((r) => r.find)
                    ? 'rgba(100,200,160,0.9)'
                    : 'rgba(100,200,160,0.3)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                현재 장면만
              </button>
            </div>

            {/* 규칙 저장/불러오기 */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 8,
              }}
            >
              <button onClick={saveRules} style={ruleIoBtnStyle}>
                규칙 저장
              </button>
              <button onClick={loadRules} style={ruleIoBtnStyle}>
                규칙 불러오기
              </button>
            </div>

            {/* 메시지 */}
            {replaceMsg && (
              <div
                style={{
                  fontSize: 11,
                  marginTop: 6,
                  color: replaceMsg.includes('없음') || replaceMsg.includes('실패')
                    ? '#f90'
                    : '#6f6',
                }}
              >
                {replaceMsg}
              </div>
            )}
          </div>
        )}
      </div>

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


      {/* 장면 정보 */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>
          {scene.id} — {scene.chapter}
        </div>
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

const replaceSectionStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(255,255,255,0.08)',
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

const ruleRemoveBtnStyle: React.CSSProperties = {
  background: 'rgba(255,80,80,0.15)',
  border: '1px solid rgba(255,80,80,0.3)',
  color: '#f66',
  borderRadius: 4,
  width: 26,
  height: 26,
  cursor: 'pointer',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const ruleAddBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px dashed rgba(255,255,255,0.15)',
  color: '#888',
  borderRadius: 4,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 11,
  marginTop: 4,
};

const ruleIoBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#aaa',
  borderRadius: 4,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 11,
};
