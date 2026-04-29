import type { AudioCacheEntry } from "../../shared/types.ts";
import {
  VOLCENGINE_VOICE_PRESETS,
  MINIMAX_VOICE_PRESETS,
  PROVIDER_LABELS,
} from "../../shared/constants.ts";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function voiceLabel(entry: AudioCacheEntry): string {
  const provider = entry.provider || "volcengine";
  const presets = provider === "minimax" ? MINIMAX_VOICE_PRESETS : VOLCENGINE_VOICE_PRESETS;
  const preset = presets.find((p) => p.value === entry.voiceType);
  return preset ? preset.label : entry.voiceType;
}

interface DetailModalProps {
  entry: AudioCacheEntry;
  onClose: () => void;
  onDownload: () => void;
  onPlay: () => void;
  onStop: () => void;
  playing: boolean;
}

export function DetailModal({
  entry,
  onClose,
  onDownload,
  onPlay,
  onStop,
  playing,
}: DetailModalProps) {
  const provider = entry.provider || "volcengine";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>缓存详情</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <span className="detail-label">文本内容</span>
            <div className="detail-text">{entry.text}</div>

            <span className="detail-label">服务商</span>
            <span className="detail-value">{PROVIDER_LABELS[provider] || provider}</span>

            <span className="detail-label">音色</span>
            <span className="detail-value">{voiceLabel(entry)}</span>

            <span className="detail-label">音色 ID</span>
            <span className="detail-value">{entry.voiceType}</span>

            <span className="detail-label">语速</span>
            <span className="detail-value">{entry.speechRate}</span>

            <span className="detail-label">音量</span>
            <span className="detail-value">{entry.loudnessRate}</span>

            <span className="detail-label">文件大小</span>
            <span className="detail-value">{formatSize(entry.audioSize)}</span>

            <span className="detail-label">创建时间</span>
            <span className="detail-value">
              {new Date(entry.createdAt).toLocaleString("zh-CN")}
            </span>

            <span className="detail-label">缓存键</span>
            <span className="detail-value" style={{ fontSize: 11, color: "#999" }}>
              {entry.cacheKey}
            </span>
          </div>
        </div>
        <div className="modal-footer">
          {playing ? (
            <button className="btn btn-secondary" onClick={onStop}>
              停止播放
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onPlay}>
              播放
            </button>
          )}
          <button className="btn btn-secondary" onClick={onDownload}>
            下载
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
