import type { AppSettings, VoiceProfile, TTSSettings, TTSProviderId } from "./types.ts";
import {
  PROFILES_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DEFAULT_PROFILES,
  DEFAULT_VOLCENGINE,
  DEFAULT_MINIMAX,
} from "./constants.ts";

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createProfile(name: string, provider: TTSProviderId): VoiceProfile {
  return {
    id: generateId(),
    name,
    provider,
    volcengine: { ...DEFAULT_VOLCENGINE },
    minimax: { ...DEFAULT_MINIMAX },
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const result = await chrome.storage.sync.get([PROFILES_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
  const storedProfiles = (result[PROFILES_STORAGE_KEY] ?? null) as VoiceProfile[] | null;

  if (storedProfiles && storedProfiles.length > 0) {
    const settingsData = result[SETTINGS_STORAGE_KEY] as Record<string, unknown> | undefined;
    return {
      profiles: storedProfiles,
      activeProfileId: (settingsData?.activeProfileId as string) ?? storedProfiles[0].id,
    };
  }

  const legacy = (result[SETTINGS_STORAGE_KEY] ?? {}) as Record<string, unknown>;
  if (legacy.provider || legacy.apiKey || legacy.volcengine) {
    const migrated = migrateLegacySettings(legacy);
    const settings: AppSettings = {
      profiles: migrated,
      activeProfileId: migrated[0].id,
    };
    await chrome.storage.sync.set({
      [PROFILES_STORAGE_KEY]: settings.profiles,
      [SETTINGS_STORAGE_KEY]: { activeProfileId: settings.activeProfileId },
    });
    return settings;
  }

  const settings: AppSettings = {
    profiles: DEFAULT_PROFILES,
    activeProfileId: DEFAULT_PROFILES[0].id,
  };
  return settings;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.sync.set({
    [PROFILES_STORAGE_KEY]: settings.profiles,
    [SETTINGS_STORAGE_KEY]: { activeProfileId: settings.activeProfileId },
  });
}

export async function saveProfiles(profiles: VoiceProfile[]): Promise<void> {
  await chrome.storage.sync.set({ [PROFILES_STORAGE_KEY]: profiles });
}

export async function saveActiveProfileId(activeProfileId: string): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: { activeProfileId } });
}

export function onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "sync" && (changes[PROFILES_STORAGE_KEY] || changes[SETTINGS_STORAGE_KEY])) {
      void getAppSettings().then(callback);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function deepCloneDefaults(): TTSSettings {
  return {
    provider: "volcengine",
    apiKey: "",
    resourceId: DEFAULT_VOLCENGINE.resourceId,
    voiceType: DEFAULT_VOLCENGINE.voiceType,
    speechRate: DEFAULT_VOLCENGINE.speechRate,
    loudnessRate: DEFAULT_VOLCENGINE.loudnessRate,
    volcengine: { ...DEFAULT_VOLCENGINE },
    minimax: { ...DEFAULT_MINIMAX },
  };
}

function migrateLegacySettings(stored: Record<string, unknown>): VoiceProfile[] {
  const settings = deepCloneDefaults();

  if (typeof stored.apiKey === "string") settings.volcengine.apiKey = stored.apiKey;
  if (typeof stored.resourceId === "string") settings.volcengine.resourceId = stored.resourceId;
  if (typeof stored.voiceType === "string") settings.volcengine.voiceType = stored.voiceType;
  if (typeof stored.speechRate === "number") settings.volcengine.speechRate = stored.speechRate;
  if (typeof stored.loudnessRate === "number")
    settings.volcengine.loudnessRate = stored.loudnessRate;

  if (typeof stored.provider === "string") settings.provider = stored.provider as TTSProviderId;

  if (stored.volcengine && typeof stored.volcengine === "object") {
    const v = stored.volcengine as Record<string, unknown>;
    if (typeof v.apiKey === "string") settings.volcengine.apiKey = v.apiKey;
    if (typeof v.resourceId === "string") settings.volcengine.resourceId = v.resourceId;
    if (typeof v.voiceType === "string") settings.volcengine.voiceType = v.voiceType;
    if (typeof v.speechRate === "number") settings.volcengine.speechRate = v.speechRate;
    if (typeof v.loudnessRate === "number") settings.volcengine.loudnessRate = v.loudnessRate;
  }

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

  const profiles: VoiceProfile[] = [];

  if (settings.volcengine.apiKey) {
    profiles.push({
      id: "migrated-volcengine",
      name: "火山引擎",
      provider: "volcengine",
      volcengine: { ...settings.volcengine },
      minimax: { ...DEFAULT_MINIMAX },
    });
  }

  if (settings.minimax.apiKey) {
    profiles.push({
      id: "migrated-minimax",
      name: "MiniMax",
      provider: "minimax",
      volcengine: { ...DEFAULT_VOLCENGINE },
      minimax: { ...settings.minimax },
    });
  }

  if (profiles.length === 0) {
    profiles.push({
      id: "migrated-volcengine",
      name: "火山引擎",
      provider: settings.provider,
      volcengine: { ...settings.volcengine },
      minimax: { ...settings.minimax },
    });
  }

  return profiles;
}

export async function getSettings(): Promise<TTSSettings> {
  const appSettings = await getAppSettings();
  const active =
    appSettings.profiles.find((p) => p.id === appSettings.activeProfileId) ??
    appSettings.profiles[0];
  if (!active) {
    return {
      provider: "volcengine",
      apiKey: "",
      resourceId: DEFAULT_VOLCENGINE.resourceId,
      voiceType: DEFAULT_VOLCENGINE.voiceType,
      speechRate: DEFAULT_VOLCENGINE.speechRate,
      loudnessRate: DEFAULT_VOLCENGINE.loudnessRate,
      volcengine: { ...DEFAULT_VOLCENGINE },
      minimax: { ...DEFAULT_MINIMAX },
    };
  }
  const settings = profileToSettings(active);

  if (import.meta.env.DEV && active.id.startsWith("default-")) {
    if (active.provider === "volcengine" && !settings.volcengine.apiKey) {
      const envKey = import.meta.env.VITE_API_KEY;
      if (envKey) {
        settings.volcengine.apiKey = envKey;
        settings.apiKey = envKey;
      }
    }
    if (active.provider === "minimax" && !settings.minimax.apiKey) {
      const envKey = import.meta.env.VITE_API_KEY_MINIMAX;
      if (envKey) {
        settings.minimax.apiKey = envKey;
        settings.apiKey = envKey;
      }
    }
  }

  return settings;
}

export function profileToSettings(profile: VoiceProfile): TTSSettings {
  return {
    provider: profile.provider,
    apiKey: profile.provider === "volcengine" ? profile.volcengine.apiKey : profile.minimax.apiKey,
    resourceId: profile.volcengine.resourceId,
    voiceType: profile.volcengine.voiceType,
    speechRate: profile.volcengine.speechRate,
    loudnessRate: profile.volcengine.loudnessRate,
    volcengine: { ...profile.volcengine },
    minimax: { ...profile.minimax },
  };
}

export async function saveSettings(_partial: Partial<TTSSettings>): Promise<void> {}
