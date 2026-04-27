import { useState } from "react";
import type { AudioCacheEntry } from "../shared/types.ts";
import { useCacheData } from "./hooks/useCacheData.ts";
import { StorageUsageBar } from "./components/StorageUsageBar.tsx";
import { CacheEntryRow } from "./components/CacheEntryRow.tsx";
import { DetailModal } from "./components/DetailModal.tsx";

export function StorageApp() {
  const data = useCacheData();
  const [detailEntry, setDetailEntry] = useState<AudioCacheEntry | null>(null);

  return (
    <div className="storage-page">
      <header className="storage-header">
        <h1>语音缓存管理</h1>
      </header>

      <StorageUsageBar
        totalSize={data.totalSize}
        maxSize={data.maxSize}
        entryCount={data.entryCount}
      />

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索文本内容..."
          value={data.query}
          onChange={(e) => data.setQuery(e.target.value)}
        />
        <div className="toolbar-actions">
          {data.selected.size > 0 ? (
            <>
              <span className="selection-count">已选 {data.selected.size} 项</span>
              <button className="btn btn-danger" onClick={() => void data.deleteSelected()}>
                删除所选
              </button>
              <button className="btn btn-secondary" onClick={data.clearSelection}>
                取消选择
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={data.selectAll}
              disabled={data.entries.length === 0}
            >
              全选
            </button>
          )}
        </div>
      </div>

      {data.loading ? (
        <div className="empty-state">加载中...</div>
      ) : data.entries.length === 0 ? (
        <div className="empty-state">{data.query ? "未找到匹配结果" : "暂无缓存记录"}</div>
      ) : (
        <table className="cache-table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={data.selected.size === data.entries.length && data.entries.length > 0}
                  onChange={() =>
                    data.selected.size === data.entries.length
                      ? data.clearSelection()
                      : data.selectAll()
                  }
                />
              </th>
              <th className="col-text">文本</th>
              <th className="col-voice">音色</th>
              <th className="col-size">大小</th>
              <th className="col-date">时间</th>
              <th className="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <CacheEntryRow
                key={entry.cacheKey}
                entry={entry}
                checked={data.selected.has(entry.cacheKey)}
                playing={data.playingKey === entry.cacheKey}
                onToggle={() => data.toggleSelect(entry.cacheKey)}
                onDownload={() => void data.downloadAudio(entry)}
                onPlay={() => void data.playAudio(entry)}
                onStop={data.stopAudio}
                onDetail={() => setDetailEntry(entry)}
              />
            ))}
          </tbody>
        </table>
      )}

      {detailEntry && (
        <DetailModal
          entry={detailEntry}
          playing={data.playingKey === detailEntry.cacheKey}
          onClose={() => setDetailEntry(null)}
          onDownload={() => void data.downloadAudio(detailEntry)}
          onPlay={() => void data.playAudio(detailEntry)}
          onStop={data.stopAudio}
        />
      )}
    </div>
  );
}
