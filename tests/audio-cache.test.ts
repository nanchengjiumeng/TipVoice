import { describe, expect, it, beforeEach } from "vite-plus/test";
import {
  computeCacheKey,
  getCachedAudio,
  storeCachedAudio,
  getAllEntries,
  searchEntries,
  deleteEntries,
  getStorageStats,
  getAudioBlob,
} from "../src/lib/audio-cache.ts";

describe("audio-cache", () => {
  const params = {
    text: "hello world",
    voiceType: "zh_female_vv_uranus_bigtts",
    speechRate: 0,
    loudnessRate: 0,
  };

  beforeEach(async () => {
    // Clear all entries before each test
    const entries = await getAllEntries();
    if (entries.length > 0) {
      await deleteEntries(entries.map((e) => e.cacheKey));
    }
  });

  describe("computeCacheKey", () => {
    it("produces consistent hash for same inputs", async () => {
      const key1 = await computeCacheKey("hello", "voice1", 0, 0);
      const key2 = await computeCacheKey("hello", "voice1", 0, 0);
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex
    });

    it("produces different hash when text differs", async () => {
      const key1 = await computeCacheKey("hello", "voice1", 0, 0);
      const key2 = await computeCacheKey("world", "voice1", 0, 0);
      expect(key1).not.toBe(key2);
    });

    it("produces different hash when voiceType differs", async () => {
      const key1 = await computeCacheKey("hello", "voice1", 0, 0);
      const key2 = await computeCacheKey("hello", "voice2", 0, 0);
      expect(key1).not.toBe(key2);
    });

    it("produces different hash when speechRate differs", async () => {
      const key1 = await computeCacheKey("hello", "voice1", 0, 0);
      const key2 = await computeCacheKey("hello", "voice1", 10, 0);
      expect(key1).not.toBe(key2);
    });

    it("produces different hash when loudnessRate differs", async () => {
      const key1 = await computeCacheKey("hello", "voice1", 0, 0);
      const key2 = await computeCacheKey("hello", "voice1", 0, 10);
      expect(key1).not.toBe(key2);
    });
  });

  describe("store and retrieve", () => {
    it("stores and retrieves audio blob correctly", async () => {
      const cacheKey = await computeCacheKey(
        params.text,
        params.voiceType,
        params.speechRate,
        params.loudnessRate,
      );
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: "audio/mpeg" });

      await storeCachedAudio({ cacheKey, ...params, audioBlob });

      const retrieved = await getCachedAudio(cacheKey);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(5);

      const bytes = new Uint8Array(await retrieved!.arrayBuffer());
      expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns null for non-existent cache key", async () => {
      const result = await getCachedAudio("nonexistent");
      expect(result).toBeNull();
    });

    it("getAudioBlob retrieves blob directly", async () => {
      const cacheKey = await computeCacheKey(
        params.text,
        params.voiceType,
        params.speechRate,
        params.loudnessRate,
      );
      const audioBlob = new Blob([new Uint8Array([10, 20, 30])], { type: "audio/mpeg" });

      await storeCachedAudio({ cacheKey, ...params, audioBlob });

      const blob = await getAudioBlob(cacheKey);
      expect(blob).not.toBeNull();
      expect(blob!.size).toBe(3);
    });
  });

  describe("getAllEntries", () => {
    it("returns entries sorted by createdAt descending", async () => {
      const key1 = await computeCacheKey("first", "voice", 0, 0);
      const key2 = await computeCacheKey("second", "voice", 0, 0);

      await storeCachedAudio({
        cacheKey: key1,
        text: "first",
        voiceType: "voice",
        speechRate: 0,
        loudnessRate: 0,
        audioBlob: new Blob([new Uint8Array([1])]),
      });

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await storeCachedAudio({
        cacheKey: key2,
        text: "second",
        voiceType: "voice",
        speechRate: 0,
        loudnessRate: 0,
        audioBlob: new Blob([new Uint8Array([2])]),
      });

      const entries = await getAllEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].text).toBe("second"); // most recent first
      expect(entries[1].text).toBe("first");
    });

    it("returns correct metadata fields", async () => {
      const cacheKey = await computeCacheKey(
        params.text,
        params.voiceType,
        params.speechRate,
        params.loudnessRate,
      );
      const audioBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });

      await storeCachedAudio({ cacheKey, ...params, audioBlob });

      const entries = await getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].cacheKey).toBe(cacheKey);
      expect(entries[0].text).toBe(params.text);
      expect(entries[0].voiceType).toBe(params.voiceType);
      expect(entries[0].speechRate).toBe(params.speechRate);
      expect(entries[0].loudnessRate).toBe(params.loudnessRate);
      expect(entries[0].audioSize).toBe(3);
      expect(entries[0].createdAt).toBeGreaterThan(0);
    });
  });

  describe("searchEntries", () => {
    it("finds entries by text substring (ILIKE)", async () => {
      const key1 = await computeCacheKey("hello world", "voice", 0, 0);
      const key2 = await computeCacheKey("goodbye world", "voice", 0, 0);
      const key3 = await computeCacheKey("something else", "voice", 0, 0);

      for (const [key, text] of [
        [key1, "hello world"],
        [key2, "goodbye world"],
        [key3, "something else"],
      ] as const) {
        await storeCachedAudio({
          cacheKey: key,
          text,
          voiceType: "voice",
          speechRate: 0,
          loudnessRate: 0,
          audioBlob: new Blob([new Uint8Array([1])]),
        });
      }

      const results = await searchEntries("world");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.text.includes("world"))).toBe(true);
    });
  });

  describe("deleteEntries", () => {
    it("deletes entries from both PG and IDB", async () => {
      const cacheKey = await computeCacheKey(
        params.text,
        params.voiceType,
        params.speechRate,
        params.loudnessRate,
      );
      const audioBlob = new Blob([new Uint8Array([1, 2, 3])]);

      await storeCachedAudio({ cacheKey, ...params, audioBlob });

      let entries = await getAllEntries();
      expect(entries).toHaveLength(1);

      await deleteEntries([cacheKey]);

      entries = await getAllEntries();
      expect(entries).toHaveLength(0);

      const blob = await getAudioBlob(cacheKey);
      expect(blob).toBeNull();
    });
  });

  describe("getStorageStats", () => {
    it("returns correct count and total size", async () => {
      const key1 = await computeCacheKey("text1", "voice", 0, 0);
      const key2 = await computeCacheKey("text2", "voice", 0, 0);

      await storeCachedAudio({
        cacheKey: key1,
        text: "text1",
        voiceType: "voice",
        speechRate: 0,
        loudnessRate: 0,
        audioBlob: new Blob([new Uint8Array(100)]),
      });

      await storeCachedAudio({
        cacheKey: key2,
        text: "text2",
        voiceType: "voice",
        speechRate: 0,
        loudnessRate: 0,
        audioBlob: new Blob([new Uint8Array(200)]),
      });

      const stats = await getStorageStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.totalSize).toBe(300);
    });

    it("returns zeros when cache is empty", async () => {
      const stats = await getStorageStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });
});
