import { useState, useEffect, useCallback, useRef } from "react";
import type { AudioCacheEntry } from "../../shared/types.ts";
import {
  getAllEntries,
  searchEntries,
  deleteEntries,
  getStorageStats,
  getAudioBlob,
} from "../../lib/audio-cache.ts";
import { AUDIO_CACHE_MAX_BYTES } from "../../shared/constants.ts";

export interface CacheData {
  entries: AudioCacheEntry[];
  totalSize: number;
  entryCount: number;
  maxSize: number;
  loading: boolean;
  query: string;
  selected: Set<string>;
  playingKey: string | null;
  setQuery: (q: string) => void;
  refresh: () => Promise<void>;
  toggleSelect: (key: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => Promise<void>;
  downloadAudio: (entry: AudioCacheEntry) => Promise<void>;
  playAudio: (entry: AudioCacheEntry) => Promise<void>;
  stopAudio: () => void;
}

export function useCacheData(): CacheData {
  const [entries, setEntries] = useState<AudioCacheEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [items, stats] = await Promise.all([
        query ? searchEntries(query) : getAllEntries(),
        getStorageStats(),
      ]);
      setEntries(items);
      setTotalSize(stats.totalSize);
      setEntryCount(stats.entryCount);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(entries.map((e) => e.cacheKey)));
  }, [entries]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    const keys = Array.from(selected);
    if (keys.length === 0) return;
    await deleteEntries(keys);
    await refresh();
  }, [selected, refresh]);

  const downloadAudio = useCallback(async (entry: AudioCacheEntry) => {
    const blob = await getAudioBlob(entry.cacheKey);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.text.slice(0, 30).replace(/[/\\?%*:|"<>]/g, "_")}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const stopAudio = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  const playAudio = useCallback(
    async (entry: AudioCacheEntry) => {
      cleanupAudio();
      const blob = await getAudioBlob(entry.cacheKey);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const el = new Audio(url);
      audioRef.current = el;
      setPlayingKey(entry.cacheKey);
      el.addEventListener("ended", cleanupAudio);
      el.addEventListener("error", cleanupAudio);
      await el.play();
    },
    [cleanupAudio],
  );

  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  return {
    entries,
    totalSize,
    entryCount,
    maxSize: AUDIO_CACHE_MAX_BYTES,
    loading,
    query,
    selected,
    playingKey,
    setQuery,
    refresh,
    toggleSelect,
    selectAll,
    clearSelection,
    deleteSelected,
    downloadAudio,
    playAudio,
    stopAudio,
  };
}
