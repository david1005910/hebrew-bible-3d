import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getRemotionEnvironment, staticFile } from 'remotion';

/**
 * Studio 전용 배경영상 업로드 패널.
 * MP4/WebM 파일을 업로드하면 public/bg-video/에 저장하고
 * 모든 composition의 bgVideoSrc/bgVideoOpacity를 업데이트한다.
 */
export const BgVideoUploader: React.FC = () => {
  try {
    if (!getRemotionEnvironment().isStudio) return null;
  } catch {
    return null;
  }

  return <BgVideoPanel />;
};

const BgVideoPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 마운트 시 저장된 설정 복원
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const url = staticFile('bg-video-config.json') + '?t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const config = await res.json();
        if (config.bgVideoSrc) {
          setFileName(config.bgVideoSrc);
          setOpacity(config.bgVideoOpacity ?? 1);
          await applyProps(config.bgVideoSrc, config.bgVideoOpacity ?? 1);
        }
      }
    } catch {
      // 설정 파일 없으면 무시
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 비디오 파일인지 확인
      if (!file.type.startsWith('video/')) {
        setError('비디오 파일만 업로드 가능합니다 (MP4, WebM 등)');
        return;
      }

      setUploading(true);
      setError(null);
      setProgress(0);

      try {
        const { writeStaticFile } = await import('@remotion/studio');

        // 파일 읽기 진행률 표시
        const contents = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (evt) => {
            if (evt.lengthComputable) {
              setProgress(Math.round((evt.loaded / evt.total) * 50));
            }
          };
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsArrayBuffer(file);
        });

        setProgress(60);

        await writeStaticFile({
          filePath: `bg-video/${file.name}`,
          contents,
        });

        setProgress(100);
        setFileName(file.name);
        setFileSize(formatSize(file.size));
        await applyProps(file.name, opacity);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [opacity],
  );

  const handleOpacityChange = useCallback(
    async (newOpacity: number) => {
      setOpacity(newOpacity);
      if (fileName) {
        await applyProps(fileName, newOpacity);
      }
    },
    [fileName],
  );

  const handleRemove = useCallback(async () => {
    setFileName(null);
    setFileSize(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    await applyProps('', 1);
  }, []);

  if (!open) {
    return (
      <div style={toggleContainerStyle}>
        <button
          onClick={() => setOpen(true)}
          style={toggleBtnStyle}
          title="배경영상 업로드"
        >
          &#9654; 배경영상
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>&#9654; 배경영상</span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>
          &#10005;
        </button>
      </div>

      {/* 파일 업로드 */}
      <div style={sectionStyle}>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            ...btnBase,
            width: '100%',
            background: uploading ? '#555' : 'rgba(80,200,120,0.9)',
            color: uploading ? '#aaa' : '#000',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 0',
          }}
        >
          {uploading ? `업로드 중... ${progress}%` : '영상 파일 선택'}
        </button>
        <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
          MP4, WebM, MOV 등 비디오 파일
        </div>
      </div>

      {/* 업로드 진행률 */}
      {uploading && (
        <div style={sectionStyle}>
          <div style={progressBarBg}>
            <div style={{ ...progressBarFill, width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* 현재 파일 정보 + 불투명도 */}
      {fileName && (
        <div style={sectionStyle}>
          <div style={fileInfoStyle}>
            <div style={{ overflow: 'hidden' }}>
              <span style={fileNameStyle}>{fileName}</span>
              {fileSize && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {fileSize}
                </div>
              )}
            </div>
            <button onClick={handleRemove} style={removeBtnStyle}>
              제거
            </button>
          </div>

          <label style={labelStyle}>
            불투명도: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'rgba(80,200,120,0.9)' }}
          />
        </div>
      )}
    </div>
  );
};

async function applyProps(bgVideoSrc: string, bgVideoOpacity: number) {
  try {
    const { updateDefaultProps, reevaluateComposition, writeStaticFile } = await import('@remotion/studio');

    // 설정을 bg-video-config.json에 영구 저장
    const config = JSON.stringify({ bgVideoSrc, bgVideoOpacity }, null, 2);
    const encoded = new TextEncoder().encode(config);
    await writeStaticFile({
      filePath: 'bg-video-config.json',
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
            bgVideoSrc,
            bgVideoOpacity,
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
  bottom: 170,
  right: 20,
  zIndex: 99997,
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '2px solid rgba(80,200,120,0.6)',
  background: 'rgba(80,200,120,0.9)',
  color: '#000',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 170,
  right: 20,
  width: 320,
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
  maxWidth: 200,
  display: 'block',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#f66',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  flexShrink: 0,
};

const progressBarBg: React.CSSProperties = {
  width: '100%',
  height: 4,
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 2,
  overflow: 'hidden',
};

const progressBarFill: React.CSSProperties = {
  height: '100%',
  background: 'rgba(80,200,120,0.9)',
  borderRadius: 2,
  transition: 'width 0.3s ease',
};
