import { useState } from "react";
import type { AudioCacheEntry } from "../../shared/types.ts";
import { useCacheData } from "./useCacheData.ts";
import { Button, Card, Checkbox, Chip, Input, ProgressBar, SearchField } from "@heroui/react";

export function CacheView() {
  const data = useCacheData();
  const [detailEntry, setDetailEntry] = useState<AudioCacheEntry | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString("zh-CN");

  const providerLabel = (p: string) => (p === "minimax" ? "MiniMax" : "火山引擎");

  const usagePercent = data.maxSize > 0 ? (data.totalSize / data.maxSize) * 100 : 0;
  const barColor = usagePercent > 90 ? "danger" : usagePercent > 70 ? "warning" : "accent";

  if (detailEntry) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onPress={() => setDetailEntry(null)} className="mb-4">
          ← 返回列表
        </Button>
        <Card>
          <Card.Content className="p-5 space-y-2">
            <Card.Title>缓存详情</Card.Title>
            <div>
              <span className="text-gray-500">文本：</span>
              {detailEntry.text}
            </div>
            <div>
              <span className="text-gray-500">服务商：</span>
              {providerLabel(detailEntry.provider)}
            </div>
            <div>
              <span className="text-gray-500">音色：</span>
              {detailEntry.voiceType}
            </div>
            <div>
              <span className="text-gray-500">大小：</span>
              {formatSize(detailEntry.audioSize)}
            </div>
            <div>
              <span className="text-gray-500">时间：</span>
              {formatDate(detailEntry.createdAt)}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" onPress={() => void data.playAudio(detailEntry)}>
                播放
              </Button>
              <Button variant="secondary" onPress={() => void data.downloadAudio(detailEntry)}>
                下载
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">语音缓存管理</h2>

      <Card className="mb-4">
        <Card.Content className="p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{data.entryCount} 条缓存</span>
            <span>
              {formatSize(data.totalSize)} / {formatSize(data.maxSize)}
            </span>
          </div>
          <ProgressBar color={barColor} value={Math.min(usagePercent, 100)}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
            <ProgressBar.Output />
          </ProgressBar>
        </Card.Content>
      </Card>

      <div className="flex gap-3 my-4 items-center">
        <SearchField fullWidth>
          <Input
            placeholder="搜索文本内容..."
            value={data.query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => data.setQuery(e.target.value)}
          />
        </SearchField>
        {data.selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">已选 {data.selected.size} 项</span>
            <Button variant="danger" size="sm" onPress={() => void data.deleteSelected()}>
              删除所选
            </Button>
            <Button variant="secondary" size="sm" onPress={data.clearSelection}>
              取消选择
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            isDisabled={data.entries.length === 0}
            onPress={data.selectAll}
          >
            全选
          </Button>
        )}
      </div>

      {data.loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : data.entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data.query ? "未找到匹配结果" : "暂无缓存记录"}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left w-10">
                  <Checkbox
                    isSelected={
                      data.selected.size === data.entries.length && data.entries.length > 0
                    }
                    onChange={() =>
                      data.selected.size === data.entries.length
                        ? data.clearSelection()
                        : data.selectAll()
                    }
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  文本
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-32">
                  音色
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">
                  大小
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-36">
                  时间
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-24">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.entries.map((entry) => (
                <tr
                  key={entry.cacheKey}
                  className={
                    data.selected.has(entry.cacheKey) ? "bg-primary-50" : "hover:bg-gray-50"
                  }
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      isSelected={data.selected.has(entry.cacheKey)}
                      onChange={() => data.toggleSelect(entry.cacheKey)}
                    />
                  </td>
                  <td
                    className="px-3 py-2 max-w-xs truncate cursor-pointer hover:text-primary-600"
                    onClick={() => setDetailEntry(entry)}
                  >
                    {entry.text}
                  </td>
                  <td className="px-3 py-2">
                    <Chip
                      size="sm"
                      color={entry.provider === "minimax" ? "accent" : "success"}
                      variant="soft"
                    >
                      {providerLabel(entry.provider)}
                    </Chip>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{formatSize(entry.audioSize)}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(entry.createdAt)}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center gap-1">
                      {data.playingKey === entry.cacheKey ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500"
                          onPress={data.stopAudio}
                        >
                          停止
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onPress={() => void data.playAudio(entry)}
                        >
                          播放
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onPress={() => void data.downloadAudio(entry)}
                      >
                        下载
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
