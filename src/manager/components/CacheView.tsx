import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AudioCacheEntry, TranslationCacheEntry, CacheType } from "../../shared/types.ts";
import { normalizeMarkdown } from "../../shared/markdown.ts";
import { useCacheData } from "./useCacheData.ts";
import { Button, Card, Checkbox, Chip, Input, ProgressBar, Tabs } from "@heroui/react";

export function CacheView() {
  const data = useCacheData();
  const [detailEntry, setDetailEntry] = useState<AudioCacheEntry | TranslationCacheEntry | null>(
    null,
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString("zh-CN");

  const providerLabel = (p: string) => {
    if (p === "minimax") return "MiniMax";
    if (p === "siliconflow") return "硅基流动";
    return "火山引擎";
  };

  const usagePercent = data.maxSize > 0 ? (data.audioTotalSize / data.maxSize) * 100 : 0;
  const barColor = usagePercent > 90 ? "danger" : usagePercent > 70 ? "warning" : "accent";

  const deleteDetailEntry = async () => {
    if (!detailEntry) return;
    await data.deleteEntry(detailEntry.cacheKey);
    setDetailEntry(null);
  };

  if (detailEntry) {
    const isAudio = detailEntry.provider === "volcengine" || detailEntry.provider === "minimax";

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onPress={() => setDetailEntry(null)} className="mb-4">
          ← 返回列表
        </Button>
        <Card>
          <Card.Content className="p-5 space-y-2">
            <Card.Title>缓存详情</Card.Title>
            <div>
              <span className="text-gray-500">原文：</span>
              {detailEntry.text}
            </div>
            <div>
              <span className="text-gray-500">服务商：</span>
              {providerLabel(detailEntry.provider)}
            </div>
            {isAudio ? (
              <>
                <div>
                  <span className="text-gray-500">音色：</span>
                  {(detailEntry as AudioCacheEntry).voiceType}
                </div>
                <div>
                  <span className="text-gray-500">大小：</span>
                  {formatSize((detailEntry as AudioCacheEntry).audioSize)}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    onPress={() => void data.playAudio(detailEntry as AudioCacheEntry)}
                  >
                    播放
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => void data.downloadAudio(detailEntry as AudioCacheEntry)}
                  >
                    下载
                  </Button>
                  <Button variant="danger" onPress={() => void deleteDetailEntry()}>
                    删除
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-gray-500">方案：</span>
                  {(detailEntry as unknown as TranslationCacheEntry).profileName}
                </div>
                <div>
                  <span className="text-gray-500">结果：</span>
                  <div className="cache-markdown mt-2 p-3 bg-gray-50 rounded text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {normalizeMarkdown((detailEntry as unknown as TranslationCacheEntry).result)}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="danger" onPress={() => void deleteDetailEntry()}>
                    删除
                  </Button>
                </div>
              </>
            )}
            <div>
              <span className="text-gray-500">时间：</span>
              {formatDate(detailEntry.createdAt)}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">缓存管理</h2>

      <Tabs
        selectedKey={data.activeType}
        onSelectionChange={(key) => data.setActiveType(key as CacheType)}
        className="mb-4"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="缓存类型">
            <Tabs.Tab id="audio">语音缓存</Tabs.Tab>
            <Tabs.Tab id="translation">翻译缓存</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="audio">
          <Card className="mb-4">
            <Card.Content className="p-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{data.audioEntryCount} 条缓存</span>
                <span>
                  {formatSize(data.audioTotalSize)} / {formatSize(data.maxSize)}
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
        </Tabs.Panel>
        <Tabs.Panel id="translation">
          <Card className="mb-4">
            <Card.Content className="p-4">
              <div className="text-xs text-gray-500">{data.translationEntryCount} 条缓存</div>
            </Card.Content>
          </Card>
        </Tabs.Panel>
      </Tabs>

      <div className="flex gap-3 my-4 items-center">
        <Input
          placeholder="搜索文本内容..."
          value={data.query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => data.setQuery(e.target.value)}
          className="flex-1"
        />
        {data.selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">
              已选 {data.selected.size} 项
            </span>
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
                {data.activeType === "audio" ? (
                  <>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-32">
                      音色
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">
                      大小
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-54">
                      方案
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-32">
                      结果
                    </th>
                  </>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-72">
                  时间
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-28">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.entries.map((entry) => {
                return (
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
                    {data.activeType === "audio" ? (
                      <>
                        <td className="px-3 py-2">
                          <Chip
                            size="sm"
                            color={entry.provider === "minimax" ? "accent" : "success"}
                            variant="soft"
                          >
                            {providerLabel(entry.provider)}
                          </Chip>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {formatSize((entry as AudioCacheEntry).audioSize)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">
                          <Chip size="sm" color="accent" variant="soft">
                            {(entry as TranslationCacheEntry).profileName}
                          </Chip>
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate text-gray-500">
                          {(entry as TranslationCacheEntry).result}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-gray-500">{formatDate(entry.createdAt)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        {data.activeType === "audio" &&
                          (data.playingKey === entry.cacheKey ? (
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
                              onPress={() => void data.playAudio(entry as AudioCacheEntry)}
                            >
                              播放
                            </Button>
                          ))}
                        {data.activeType === "audio" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onPress={() => void data.downloadAudio(entry as AudioCacheEntry)}
                          >
                            下载
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500"
                          onPress={() => void data.deleteEntry(entry.cacheKey)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
