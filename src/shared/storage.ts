import type { TTSSettings } from "./types.ts";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "./constants.ts";

export async function getSettings(): Promise<TTSSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = (result[STORAGE_KEY] ?? {}) as Partial<TTSSettings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(partial: Partial<TTSSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
}

export function onSettingsChanged(callback: (settings: TTSSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      callback(changes[STORAGE_KEY].newValue as TTSSettings);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
