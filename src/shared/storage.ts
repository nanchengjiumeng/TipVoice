import type { TTSSettings } from "./types.ts";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "./constants.ts";

function deepCloneDefaults(): TTSSettings {
  return {
    ...DEFAULT_SETTINGS,
    volcengine: { ...DEFAULT_SETTINGS.volcengine },
    minimax: { ...DEFAULT_SETTINGS.minimax },
  };
}

function migrateSettings(stored: Record<string, unknown>): TTSSettings {
  const settings = deepCloneDefaults();

  // Auto-fill API keys from env vars in development when storage is empty
  if (!settings.volcengine.apiKey) {
    const envKey = import.meta.env["VITE_API_KEY"];
    if (typeof envKey === "string" && envKey) settings.volcengine.apiKey = envKey;
  }
  if (!settings.minimax.apiKey) {
    const envKey = import.meta.env["VITE_API_KEY_MINIMAX"];
    if (typeof envKey === "string" && envKey) settings.minimax.apiKey = envKey;
  }

  // Top-level legacy fields
  if (typeof stored.apiKey === "string") settings.volcengine.apiKey = stored.apiKey;
  if (typeof stored.resourceId === "string") settings.volcengine.resourceId = stored.resourceId;
  if (typeof stored.voiceType === "string") settings.volcengine.voiceType = stored.voiceType;
  if (typeof stored.speechRate === "number") settings.volcengine.speechRate = stored.speechRate;
  if (typeof stored.loudnessRate === "number")
    settings.volcengine.loudnessRate = stored.loudnessRate;

  // New provider field
  if (typeof stored.provider === "string")
    settings.provider = stored.provider as TTSSettings["provider"];

  // Nested volcengine settings (override top-level if present)
  if (stored.volcengine && typeof stored.volcengine === "object") {
    const v = stored.volcengine as Record<string, unknown>;
    if (typeof v.apiKey === "string") settings.volcengine.apiKey = v.apiKey;
    if (typeof v.resourceId === "string") settings.volcengine.resourceId = v.resourceId;
    if (typeof v.voiceType === "string") settings.volcengine.voiceType = v.voiceType;
    if (typeof v.speechRate === "number") settings.volcengine.speechRate = v.speechRate;
    if (typeof v.loudnessRate === "number") settings.volcengine.loudnessRate = v.loudnessRate;
  }

  // Nested minimax settings
  if (stored.minimax && typeof stored.minimax === "object") {
    const m = stored.minimax as Record<string, unknown>;
    if (typeof m.apiKey === "string") settings.minimax.apiKey = m.apiKey;
    if (typeof m.model === "string")
      settings.minimax.model = m.model as TTSSettings["minimax"]["model"];
    if (typeof m.voiceId === "string") settings.minimax.voiceId = m.voiceId;
    if (typeof m.speed === "number") settings.minimax.speed = m.speed;
    if (typeof m.vol === "number") settings.minimax.vol = m.vol;
    if (typeof m.pitch === "number") settings.minimax.pitch = m.pitch;
    if (typeof m.sampleRate === "number") settings.minimax.sampleRate = m.sampleRate;
    if (typeof m.audioFormat === "string")
      settings.minimax.audioFormat = m.audioFormat as TTSSettings["minimax"]["audioFormat"];
  }

  return settings;
}

export async function getSettings(): Promise<TTSSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = (result[STORAGE_KEY] ?? {}) as Record<string, unknown>;
  return migrateSettings(stored);
}

export async function saveSettings(partial: Partial<TTSSettings>): Promise<void> {
  const current = await getSettings();
  const updated = {
    ...current,
    ...(partial.volcengine ? { volcengine: { ...current.volcengine, ...partial.volcengine } } : {}),
    ...(partial.minimax ? { minimax: { ...current.minimax, ...partial.minimax } } : {}),
  };

  // Also pick up any top-level primitive fields from partial
  if (partial.provider !== undefined) updated.provider = partial.provider;

  await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
}

export function onSettingsChanged(callback: (settings: TTSSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      const stored = (changes[STORAGE_KEY].newValue ?? {}) as Record<string, unknown>;
      callback(migrateSettings(stored));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
