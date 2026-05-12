import type {
  AppSettings,
  VoiceProfile,
  TTSSettings,
  TTSProviderId,
  TranslationSettings,
  TranslationProfile,
  TranslationProviderId,
} from "./types.ts";
import {
  PROFILES_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DEFAULT_PROFILES,
  DEFAULT_VOLCENGINE,
  DEFAULT_MINIMAX,
  TRANSLATION_PROFILES_STORAGE_KEY,
  TRANSLATION_SETTINGS_STORAGE_KEY,
  DEFAULT_TRANSLATION_PROFILES,
  DEFAULT_MINIMAX_TRANSLATION,
  DEFAULT_SILICONFLOW_TRANSLATION,
} from "./constants.ts";

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getEnvApiKeys(): {
  volcengine: string;
  minimax: string;
  siliconflow: string;
} {
  return {
    volcengine: import.meta.env.VITE_API_KEY ?? "",
    minimax: import.meta.env.VITE_API_KEY_MINIMAX ?? "",
    siliconflow: import.meta.env.VITE_API_KEY_SILICONFLOW ?? "",
  };
}

function fillVoiceProfileEnvApiKeys(profile: VoiceProfile): VoiceProfile {
  const keys = getEnvApiKeys();
  return {
    ...profile,
    volcengine: {
      ...profile.volcengine,
      apiKey: profile.volcengine.apiKey || keys.volcengine,
    },
    minimax: {
      ...profile.minimax,
      apiKey: profile.minimax.apiKey || keys.minimax,
    },
  };
}

function fillTranslationProfileEnvApiKeys(profile: TranslationProfile): TranslationProfile {
  const keys = getEnvApiKeys();
  return {
    ...profile,
    minimax: {
      ...profile.minimax,
      apiKey: profile.minimax.apiKey || keys.minimax,
    },
    siliconflow: {
      ...profile.siliconflow,
      apiKey: profile.siliconflow.apiKey || keys.siliconflow,
    },
  };
}

export function createProfile(name: string, provider: TTSProviderId): VoiceProfile {
  return fillVoiceProfileEnvApiKeys({
    id: generateId(),
    name,
    provider,
    volcengine: { ...DEFAULT_VOLCENGINE },
    minimax: { ...DEFAULT_MINIMAX },
  });
}

export function createTranslationProfile(
  name: string,
  provider: TranslationProviderId,
): TranslationProfile {
  const profile = fillTranslationProfileEnvApiKeys({
    id: generateId(),
    name,
    provider,
    minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
    siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
  });

  return profile;
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

export async function getTranslationSettings(): Promise<TranslationSettings> {
  const result = await chrome.storage.sync.get([
    TRANSLATION_PROFILES_STORAGE_KEY,
    TRANSLATION_SETTINGS_STORAGE_KEY,
  ]);
  const storedProfiles = (result[TRANSLATION_PROFILES_STORAGE_KEY] ?? null) as
    | TranslationProfile[]
    | null;

  if (storedProfiles && storedProfiles.length > 0) {
    const settingsData = result[TRANSLATION_SETTINGS_STORAGE_KEY] as
      | Record<string, unknown>
      | undefined;
    const profiles = storedProfiles.map((p) =>
      fillTranslationProfileEnvApiKeys(normalizeTranslationProfile(p)),
    );
    return {
      translationProfiles: profiles,
      activeTranslationProfileIds: normalizeActiveTranslationProfileIds(settingsData, profiles),
    };
  }

  let profiles = DEFAULT_TRANSLATION_PROFILES.map((p) => fillTranslationProfileEnvApiKeys(p));

  const settings: TranslationSettings = {
    translationProfiles: profiles,
    activeTranslationProfileIds: profiles.map((profile) => profile.id),
  };
  return settings;
}

export async function saveTranslationSettings(settings: TranslationSettings): Promise<void> {
  await chrome.storage.sync.set({
    [TRANSLATION_PROFILES_STORAGE_KEY]: settings.translationProfiles,
    [TRANSLATION_SETTINGS_STORAGE_KEY]: {
      activeTranslationProfileIds: settings.activeTranslationProfileIds,
    },
  });
}

export function onTranslationSettingsChanged(
  callback: (settings: TranslationSettings) => void,
): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (
      area === "sync" &&
      (changes[TRANSLATION_PROFILES_STORAGE_KEY] || changes[TRANSLATION_SETTINGS_STORAGE_KEY])
    ) {
      void getTranslationSettings().then(callback);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

function normalizeTranslationProfile(profile: TranslationProfile): TranslationProfile {
  return {
    ...profile,
    provider: profile.provider === "siliconflow" ? "siliconflow" : "minimax",
    minimax: {
      ...DEFAULT_MINIMAX_TRANSLATION,
      ...profile.minimax,
    },
    siliconflow: {
      ...DEFAULT_SILICONFLOW_TRANSLATION,
      ...profile.siliconflow,
    },
  };
}

function normalizeActiveTranslationProfileIds(
  settingsData: Record<string, unknown> | undefined,
  profiles: TranslationProfile[],
): string[] {
  const validIds = new Set(profiles.map((profile) => profile.id));
  const storedIds = Array.isArray(settingsData?.activeTranslationProfileIds)
    ? settingsData.activeTranslationProfileIds.filter((id): id is string => typeof id === "string")
    : [];
  const migratedId =
    typeof settingsData?.activeTranslationProfileId === "string"
      ? settingsData.activeTranslationProfileId
      : null;

  const ids =
    storedIds.length > 0 ? storedIds : migratedId ? [migratedId] : profiles.map((p) => p.id);
  const normalized = ids.filter((id) => validIds.has(id));

  return normalized.length > 0 ? normalized : profiles.map((profile) => profile.id);
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

  const keys = getEnvApiKeys();
  settings.volcengine.apiKey = settings.volcengine.apiKey || keys.volcengine;
  settings.minimax.apiKey = settings.minimax.apiKey || keys.minimax;

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
  const result = await chrome.storage.sync.get([PROFILES_STORAGE_KEY, SETTINGS_STORAGE_KEY]);

  const storedProfiles = result[PROFILES_STORAGE_KEY] as VoiceProfile[] | null;

  if (storedProfiles && storedProfiles.length > 0) {
    const profiles = storedProfiles.map((p) => fillVoiceProfileEnvApiKeys(p));

    const settingsData = result[SETTINGS_STORAGE_KEY] as Record<string, unknown> | undefined;
    const activeId = (settingsData?.activeProfileId as string) ?? profiles[0].id;
    const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

    return profileToSettings(active);
  }

  const legacy = (result[SETTINGS_STORAGE_KEY] ?? {}) as Record<string, unknown>;
  if (legacy.provider || legacy.apiKey || legacy.volcengine) {
    const migrated = migrateLegacySettings(legacy);

    const profiles = migrated.map((p) => fillVoiceProfileEnvApiKeys(p));

    await chrome.storage.sync.set({
      [PROFILES_STORAGE_KEY]: profiles,
      [SETTINGS_STORAGE_KEY]: { activeProfileId: profiles[0].id },
    });

    return profileToSettings(profiles[0]);
  }

  let profiles = DEFAULT_PROFILES.map((p) => fillVoiceProfileEnvApiKeys(p));

  return profileToSettings(profiles[0]);
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
