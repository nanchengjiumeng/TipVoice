import type {
  AudioCacheEntry,
  TranslationCacheEntry,
  CacheEntry,
  CacheType,
} from "../shared/types.ts";
import {
  AUDIO_BLOB_DB_NAME,
  AUDIO_BLOB_STORE_NAME,
  AUDIO_CACHE_MAX_BYTES,
} from "../shared/constants.ts";

const META_STORE = "metadata";
const TRANSLATION_STORE = "translation";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_BLOB_DB_NAME, 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_BLOB_STORE_NAME)) {
        db.createObjectStore(AUDIO_BLOB_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        const store = db.createObjectStore(META_STORE, { keyPath: "cacheKey" });
        store.createIndex("by-created", "createdAt");
      } else {
        const store = request.transaction!.objectStore(META_STORE);
        if (!store.indexNames.contains("by-provider")) {
          store.createIndex("by-provider", "provider", { unique: false });
        }
      }
      if (!db.objectStoreNames.contains(TRANSLATION_STORE)) {
        const store = db.createObjectStore(TRANSLATION_STORE, { keyPath: "cacheKey" });
        store.createIndex("by-created", "createdAt");
        store.createIndex("by-provider", "provider", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function computeCacheKey(
  text: string,
  provider: string,
  voiceType: string,
  speechRate: number,
  loudnessRate: number,
): Promise<string> {
  const input = JSON.stringify([text, provider, voiceType, speechRate, loudnessRate]);
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeTranslationCacheKey(
  text: string,
  provider: string,
  profileId: string,
): Promise<string> {
  const input = JSON.stringify([text, provider, profileId]);
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getCachedAudio(cacheKey: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_BLOB_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_BLOB_STORE_NAME);
    const req = store.get(cacheKey);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSLATION_STORE, "readonly");
    const store = tx.objectStore(TRANSLATION_STORE);
    const req = store.get(cacheKey);
    req.onsuccess = () => {
      const entry = req.result as TranslationCacheEntry | undefined;
      resolve(entry?.result ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function storeCachedAudio(params: {
  cacheKey: string;
  text: string;
  provider: string;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
  audioBlob: Blob;
}): Promise<void> {
  const db = await openDB();

  const currentSize = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const req = store.openCursor();
    let total = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        total += (cursor.value as AudioCacheEntry).audioSize;
        cursor.continue();
      } else {
        resolve(total);
      }
    };
    req.onerror = () => reject(req.error);
  });

  if (currentSize + params.audioBlob.size > AUDIO_CACHE_MAX_BYTES) {
    db.close();
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, AUDIO_BLOB_STORE_NAME], "readwrite");

    const metaStore = tx.objectStore(META_STORE);
    const entry: AudioCacheEntry = {
      cacheKey: params.cacheKey,
      text: params.text,
      provider: params.provider as AudioCacheEntry["provider"],
      voiceType: params.voiceType,
      speechRate: params.speechRate,
      loudnessRate: params.loudnessRate,
      audioSize: params.audioBlob.size,
      createdAt: Date.now(),
    };
    metaStore.put(entry);

    const blobStore = tx.objectStore(AUDIO_BLOB_STORE_NAME);
    blobStore.put(params.audioBlob, params.cacheKey);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function storeCachedTranslation(params: {
  cacheKey: string;
  text: string;
  provider: string;
  profileId: string;
  profileName: string;
  result: string;
}): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSLATION_STORE, "readwrite");
    const store = tx.objectStore(TRANSLATION_STORE);

    const entry: TranslationCacheEntry = {
      cacheKey: params.cacheKey,
      text: params.text,
      provider: params.provider as TranslationCacheEntry["provider"],
      profileId: params.profileId,
      profileName: params.profileName,
      result: params.result,
      createdAt: Date.now(),
    };

    store.put(entry);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllAudioEntries(): Promise<AudioCacheEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const index = store.index("by-created");
    const req = index.openCursor(null, "prev");
    const entries: AudioCacheEntry[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const entry = cursor.value as AudioCacheEntry;
        if (!entry.provider) {
          entry.provider = "volcengine";
        }
        entries.push(entry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllTranslationEntries(): Promise<TranslationCacheEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSLATION_STORE, "readonly");
    const store = tx.objectStore(TRANSLATION_STORE);
    const index = store.index("by-created");
    const req = index.openCursor(null, "prev");
    const entries: TranslationCacheEntry[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        entries.push(cursor.value as TranslationCacheEntry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllEntries(): Promise<CacheEntry[]> {
  const audioEntries = await getAllAudioEntries();
  const translationEntries = await getAllTranslationEntries();
  return [...audioEntries, ...translationEntries];
}

export async function searchEntries(query: string, type?: CacheType): Promise<CacheEntry[]> {
  let entries: CacheEntry[];
  if (type === "audio") {
    entries = await getAllAudioEntries();
  } else if (type === "translation") {
    entries = await getAllTranslationEntries();
  } else {
    entries = await getAllEntries();
  }

  const lower = query.toLowerCase();
  return entries.filter((e) => e.text.toLowerCase().includes(lower));
}

export async function getAudioBlob(cacheKey: string): Promise<Blob | null> {
  return getCachedAudio(cacheKey);
}

export async function deleteEntries(cacheKeys: string[], type: CacheType): Promise<void> {
  if (cacheKeys.length === 0) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const stores = type === "audio" ? [META_STORE, AUDIO_BLOB_STORE_NAME] : [TRANSLATION_STORE];
    const tx = db.transaction(stores, "readwrite");

    for (const key of cacheKeys) {
      if (type === "audio") {
        tx.objectStore(META_STORE).delete(key);
        tx.objectStore(AUDIO_BLOB_STORE_NAME).delete(key);
      } else {
        tx.objectStore(TRANSLATION_STORE).delete(key);
      }
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getStorageStats(): Promise<{
  audioTotalSize: number;
  audioEntryCount: number;
  translationEntryCount: number;
}> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, TRANSLATION_STORE], "readonly");
    const metaStore = tx.objectStore(META_STORE);
    const transStore = tx.objectStore(TRANSLATION_STORE);

    let audioTotalSize = 0;
    let audioEntryCount = 0;
    let translationEntryCount = 0;

    const metaReq = metaStore.openCursor();
    metaReq.onsuccess = () => {
      const cursor = metaReq.result;
      if (cursor) {
        audioTotalSize += (cursor.value as AudioCacheEntry).audioSize;
        audioEntryCount++;
        cursor.continue();
      }
    };
    metaReq.onerror = () => reject(metaReq.error);

    const transReq = transStore.openCursor();
    transReq.onsuccess = () => {
      const cursor = transReq.result;
      if (cursor) {
        translationEntryCount++;
        cursor.continue();
      }
    };
    transReq.onerror = () => reject(transReq.error);

    tx.oncomplete = () => {
      db.close();
      resolve({ audioTotalSize, audioEntryCount, translationEntryCount });
    };
  });
}
