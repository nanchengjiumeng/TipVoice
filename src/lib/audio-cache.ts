import {
  computeCacheKey,
  deleteEntries as deleteCacheEntries,
  getAllAudioEntries,
  getAudioBlob,
  getCachedAudio,
  getStorageStats as getCacheStorageStats,
  searchEntries as searchCacheEntries,
  storeCachedAudio,
} from "./cache.ts";

export { computeCacheKey, getAudioBlob, getCachedAudio, storeCachedAudio };

export async function getAllEntries() {
  return getAllAudioEntries();
}

export async function searchEntries(query: string) {
  return searchCacheEntries(query, "audio");
}

export async function deleteEntries(cacheKeys: string[]) {
  return deleteCacheEntries(cacheKeys, "audio");
}

export async function getStorageStats(): Promise<{ totalSize: number; entryCount: number }> {
  const stats = await getCacheStorageStats();
  return {
    totalSize: stats.audioTotalSize,
    entryCount: stats.audioEntryCount,
  };
}
