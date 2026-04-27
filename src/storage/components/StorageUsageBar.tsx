function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface StorageUsageBarProps {
  totalSize: number;
  maxSize: number;
  entryCount: number;
}

export function StorageUsageBar({ totalSize, maxSize, entryCount }: StorageUsageBarProps) {
  const percent = maxSize > 0 ? (totalSize / maxSize) * 100 : 0;
  const barColor = percent > 90 ? "#e53e3e" : percent > 70 ? "#d69e2e" : "#4a90d9";

  return (
    <div className="usage-bar-container">
      <div className="usage-info">
        <span>
          {formatSize(totalSize)} / {formatSize(maxSize)}
        </span>
        <span>{entryCount} 条记录</span>
      </div>
      <div className="usage-bar-track">
        <div
          className="usage-bar-fill"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
