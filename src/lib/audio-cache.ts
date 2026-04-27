import type { AudioCacheEntry } from "../shared/types.ts";
import {
  AUDIO_BLOB_DB_NAME,
  AUDIO_BLOB_STORE_NAME,
  AUDIO_CACHE_MAX_BYTES,
} from "../shared/constants.ts";

// --- IndexedDB ---
// Two object stores in the same database:
//   "blobs"    – audio Blob data, keyed by cacheKey
//   "metadata" – AudioCacheEntry JSON objects, keyPath: "cacheKey"

const META_STORE = "metadata";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_BLOB_DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_BLOB_STORE_NAME)) {
        db.createObjectStore(AUDIO_BLOB_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        const store = db.createObjectStore(META_STORE, { keyPath: "cacheKey" });
        store.createIndex("by-created", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Public API ---

export async function computeCacheKey(
  text: string,
  voiceType: string,
  speechRate: number,
  loudnessRate: number,
): Promise<string> {
  const input = JSON.stringify([text, voiceType, speechRate, loudnessRate]);
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

export async function storeCachedAudio(params: {
  cacheKey: string;
  text: string;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
  audioBlob: Blob;
}): Promise<void> {
  const db = await openDB();

  // Check storage limit
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
    return; // Over limit, skip storing
  }

  // Store metadata + blob in a single transaction
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, AUDIO_BLOB_STORE_NAME], "readwrite");

    const metaStore = tx.objectStore(META_STORE);
    const entry: AudioCacheEntry = {
      cacheKey: params.cacheKey,
      text: params.text,
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

export async function getAllEntries(): Promise<AudioCacheEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const index = store.index("by-created");
    const req = index.openCursor(null, "prev"); // descending
    const entries: AudioCacheEntry[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        entries.push(cursor.value as AudioCacheEntry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function searchEntries(query: string): Promise<AudioCacheEntry[]> {
  const all = await getAllEntries();
  const lower = query.toLowerCase();
  return all.filter((e) => e.text.toLowerCase().includes(lower));
}

export async function getAudioBlob(cacheKey: string): Promise<Blob | null> {
  return getCachedAudio(cacheKey);
}

export async function deleteEntries(cacheKeys: string[]): Promise<void> {
  if (cacheKeys.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, AUDIO_BLOB_STORE_NAME], "readwrite");
    const metaStore = tx.objectStore(META_STORE);
    const blobStore = tx.objectStore(AUDIO_BLOB_STORE_NAME);
    for (const key of cacheKeys) {
      metaStore.delete(key);
      blobStore.delete(key);
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

export async function getStorageStats(): Promise<{ totalSize: number; entryCount: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const req = store.openCursor();
    let totalSize = 0;
    let entryCount = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        totalSize += (cursor.value as AudioCacheEntry).audioSize;
        entryCount++;
        cursor.continue();
      } else {
        resolve({ totalSize, entryCount });
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
