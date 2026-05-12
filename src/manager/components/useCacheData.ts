import { useState, useCallback, useEffect } from "react";
import type {
  AudioCacheEntry,
  TranslationCacheEntry,
  CacheEntry,
  CacheType,
} from "../../shared/types.ts";
import {
  getAllAudioEntries,
  getAllTranslationEntries,
  deleteEntries,
  getAudioBlob,
  getStorageStats,
} from "../../lib/cache.ts";
import { AUDIO_CACHE_MAX_BYTES } from "../../shared/constants.ts";

interface CacheData {
  loading: boolean;
  query: string;
  setQuery: (q: string) => void;
  activeType: CacheType;
  setActiveType: (t: CacheType) => void;
  audioEntries: AudioCacheEntry[];
  translationEntries: TranslationCacheEntry[];
  entries: CacheEntry[];
  selected: Set<string>;
  toggleSelect: (key: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  deleteEntry: (key: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  playingKey: string | null;
  downloadAudio: (entry: AudioCacheEntry) => Promise<void>;
  playAudio: (entry: AudioCacheEntry) => Promise<void>;
  stopAudio: () => void;
  audioTotalSize: number;
  audioEntryCount: number;
  translationEntryCount: number;
  maxSize: number;
}

export function useCacheData(): CacheData {
  const [audioEntries, setAudioEntries] = useState<AudioCacheEntry[]>([]);
  const [translationEntries, setTranslationEntries] = useState<TranslationCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<CacheType>("audio");
  const [selected, setSelected] = useState(new Set<string>());
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioTotalSize, setAudioTotalSize] = useState(0);
  const [audioEntryCount, setAudioEntryCount] = useState(0);
  const [translationEntryCount, setTranslationEntryCount] = useState(0);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [audio, translation, stats] = await Promise.all([
        getAllAudioEntries(),
        getAllTranslationEntries(),
        getStorageStats(),
      ]);
      setAudioEntries(audio);
      setTranslationEntries(translation);
      setAudioTotalSize(stats.audioTotalSize);
      setAudioEntryCount(stats.audioEntryCount);
      setTranslationEntryCount(stats.translationEntryCount);
    } catch (err) {
      console.error("Failed to load cache entries:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const entries = activeType === "audio" ? audioEntries : translationEntries;

  const filteredEntries = query
    ? entries.filter((e) => e.text.toLowerCase().includes(query.toLowerCase()))
    : entries;

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filteredEntries.map((e) => e.cacheKey)));
  }, [filteredEntries]);

  const deleteEntry = useCallback(
    async (key: string) => {
      await deleteEntries([key], activeType);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      await loadEntries();
    },
    [activeType, loadEntries],
  );

  const deleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    await deleteEntries(Array.from(selected), activeType);
    setSelected(new Set());
    await loadEntries();
  }, [selected, activeType, loadEntries]);

  const downloadAudio = useCallback(async (entry: AudioCacheEntry) => {
    const blob = await getAudioBlob(entry.cacheKey);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audio_${entry.cacheKey.slice(0, 8)}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const playAudio = useCallback(
    async (entry: AudioCacheEntry) => {
      if (playingKey) {
        setPlayingKey(null);
        return;
      }

      const blob = await getAudioBlob(entry.cacheKey);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingKey(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingKey(null);
        URL.revokeObjectURL(url);
      };

      setPlayingKey(entry.cacheKey);
      void audio.play();
    },
    [playingKey],
  );

  const stopAudio = useCallback(() => {
    setPlayingKey(null);
  }, []);

  return {
    loading,
    query,
    setQuery,
    activeType,
    setActiveType,
    audioEntries,
    translationEntries,
    entries: filteredEntries,
    selected,
    toggleSelect,
    clearSelection,
    selectAll,
    deleteEntry,
    deleteSelected,
    playingKey,
    downloadAudio,
    playAudio,
    stopAudio,
    audioTotalSize,
    audioEntryCount,
    translationEntryCount,
    maxSize: AUDIO_CACHE_MAX_BYTES,
  };
}
