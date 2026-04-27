import "fake-indexeddb/auto";

// Mock chrome.storage.sync API
const store: Record<string, unknown> = {};
const listeners: Array<
  (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
> = [];

const storageSyncMock = {
  get(keys: string | string[]) {
    const result: Record<string, unknown> = {};
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) {
      if (key in store) {
        result[key] = store[key];
      }
    }
    return Promise.resolve(result);
  },
  set(items: Record<string, unknown>) {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: store[key], newValue: value };
      store[key] = value;
    }
    for (const listener of listeners) {
      listener(changes, "sync");
    }
    return Promise.resolve();
  },
  clear() {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    return Promise.resolve();
  },
};

const onChangedMock = {
  addListener(fn: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void) {
    listeners.push(fn);
  },
  removeListener(
    fn: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void,
  ) {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  },
};

globalThis.chrome = {
  storage: {
    sync: storageSyncMock,
    onChanged: onChangedMock,
  },
  runtime: {
    sendMessage: () => Promise.resolve(undefined),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
} as unknown as typeof chrome;

// Helper to reset store between tests
export function resetChromeStorage() {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  listeners.length = 0;
}
