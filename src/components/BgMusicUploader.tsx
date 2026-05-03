import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getRemotionEnvironment, staticFile } from 'remotion';

/**
 * Studio 전용 배경음악 업로드 패널.
 * 오디오 파일을 업로드하면 public/bg-music/에 저장하고
 * 모든 composition의 bgMusicSrc/bgMusicVolume을 업데이트한다.
 */
export const BgMusicUploader: React.FC = () => {
  // Studio 모드가 아니면 숨김
  try {
    if (!getRemotionEnvironment().isStudio) return null;
  } catch {
    return null;
  }

  return <BgMusicPanel />;
};

const BgMusicPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.3);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 마운트 시 저장된 설정 복원
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const url = staticFile('bg-music-config.json') + '?t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const config = await res.json();
        if (config.bgMusicSrc) {
          setFileName(config.bgMusicSrc);
          setVolume(config.bgMusicVolume ?? 0.3);
          await applyProps(config.bgMusicSrc, config.bgMusicVolume ?? 0.3);
        }
      }
    } catch {
      // 설정 파일 없으면 무시
    }
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const { writeStaticFile } = await import('@remotion/studio');
        const contents = await file.arrayBuffer();

        await writeStaticFile({
          filePath: `bg-music/${file.name}`,
          contents,
        });

        setFileName(file.name);
        await applyProps(file.name, volume);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [volume],
  );

  const handleVolumeChange = useCallback(
    async (newVolume: number) => {
      setVolume(newVolume);
      if (fileName) {
        await applyProps(fileName, newVolume);
      }
    },
    [fileName],
  );

  const handleRemove = useCallback(async () => {
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    await applyProps('', 0.3);
  }, []);

  if (!open) {
    return (
      <div style={toggleContainerStyle}>
        <button
          onClick={() => setOpen(true)}
          style={toggleBtnStyle}
          title="배경음악 업로드"
        >
          ♪ 배경음악
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>♪ 배경음악</span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      {/* 파일 업로드 */}
      <div style={sectionStyle}>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            ...btnBase,
            width: '100%',
            background: uploading ? '#555' : 'rgba(100,160,250,0.9)',
            color: uploading ? '#aaa' : '#000',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 0',
          }}
        >
          {uploading ? '업로드 중...' : '음악 파일 선택'}
        </button>
        <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
          MP3, WAV, OGG 등 오디오 파일
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* 현재 파일 정보 + 볼륨 */}
      {fileName && (
        <div style={sectionStyle}>
          <div style={fileInfoStyle}>
            <span style={fileNameStyle}>{fileName}</span>
            <button onClick={handleRemove} style={removeBtnStyle}>
              제거
            </button>
          </div>

          <label style={labelStyle}>볼륨: {Math.round(volume * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'rgba(100,160,250,0.9)' }}
          />
        </div>
      )}
    </div>
  );
};

async function applyProps(bgMusicSrc: string, bgMusicVolume: number) {
  try {
    const { updateDefaultProps, reevaluateComposition, writeStaticFile } = await import('@remotion/studio');

    // 설정을 bg-music-config.json에 영구 저장
    const config = JSON.stringify({ bgMusicSrc, bgMusicVolume }, null, 2);
    const encoded = new TextEncoder().encode(config);
    await writeStaticFile({
      filePath: 'bg-music-config.json',
      contents: encoded.buffer as ArrayBuffer,
    });

    const compositionIds = [
      'GenesisSubtitles',
      'GenesisSubtitles-Preview',
      'BibleVerseSubtitles',
    ];
    for (const compositionId of compositionIds) {
      try {
        updateDefaultProps({
          compositionId,
          defaultProps: (prev: Record<string, unknown>) => ({
            ...prev,
            bgMusicSrc,
            bgMusicVolume,
          }),
        });
      } catch {
        // composition이 없으면 무시
      }
    }
    reevaluateComposition();
  } catch {
    // Studio API 밖에서는 무시
  }
}

// ── 스타일 ──────────────────────────────────────────────

const toggleContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 120,
  right: 20,
  zIndex: 99997,
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '2px solid rgba(100,160,250,0.6)',
  background: 'rgba(100,160,250,0.9)',
  color: '#000',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 120,
  right: 20,
  width: 300,
  background: '#1a1a1e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 99997,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: '#ddd',
  fontSize: 13,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
  borderRadius: '12px 12px 0 0',
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
  padding: '12px 16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#999',
  marginBottom: 6,
  marginTop: 10,
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

const errorStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  color: '#f66',
  background: 'rgba(255,0,0,0.08)',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};

const fileInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const fileNameStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#6f6',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 180,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#f66',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
