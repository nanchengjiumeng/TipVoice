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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function voiceLabel(entry: AudioCacheEntry): string {
  const provider = entry.provider || "volcengine";
  const presets = provider === "minimax" ? MINIMAX_VOICE_PRESETS : VOLCENGINE_VOICE_PRESETS;
  const preset = presets.find((p) => p.value === entry.voiceType);
  return preset ? preset.label : entry.voiceType;
}

interface CacheEntryRowProps {
  entry: AudioCacheEntry;
  checked: boolean;
  playing: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onPlay: () => void;
  onStop: () => void;
  onDetail: () => void;
}

export function CacheEntryRow({
  entry,
  checked,
  playing,
  onToggle,
  onDownload,
  onPlay,
  onStop,
  onDetail,
}: CacheEntryRowProps) {
  const provider = entry.provider || "volcengine";
  return (
    <tr className={checked ? "row-selected" : ""}>
      <td className="col-check">
        <input type="checkbox" checked={checked} onChange={onToggle} />
      </td>
      <td className="col-text" title={entry.text}>
        <button className="text-link" onClick={onDetail}>
          {entry.text.length > 60 ? entry.text.slice(0, 60) + "..." : entry.text}
        </button>
      </td>
      <td className="col-voice">
        <span className="provider-badge" data-provider={provider}>
          {PROVIDER_LABELS[provider] || provider}
        </span>
        {voiceLabel(entry)}
      </td>
      <td className="col-size">{formatSize(entry.audioSize)}</td>
      <td className="col-date">{formatDate(entry.createdAt)}</td>
      <td className="col-actions">
        <div className="action-btns">
          {playing ? (
            <button className="btn-icon playing" title="停止" onClick={onStop}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          ) : (
            <button className="btn-icon" title="播放" onClick={onPlay}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
          <button className="btn-icon" title="下载" onClick={onDownload}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
