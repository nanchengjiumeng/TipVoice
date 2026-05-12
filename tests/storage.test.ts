import { describe, expect, it, beforeEach } from "vite-plus/test";
import {
  getAppSettings,
  saveAppSettings,
  saveProfiles,
  getSettings,
  getTranslationSettings,
} from "../src/shared/storage.ts";
import {
  DEFAULT_VOLCENGINE,
  DEFAULT_MINIMAX,
  DEFAULT_MINIMAX_TRANSLATION,
  DEFAULT_SILICONFLOW_TRANSLATION,
} from "../src/shared/constants.ts";
import type { TranslationProfile, VoiceProfile } from "../src/shared/types.ts";
import { resetChromeStorage } from "./setup.ts";

describe("storage", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("returns default profiles when storage is empty", async () => {
    const settings = await getAppSettings();
    expect(settings.profiles.length).toBeGreaterThanOrEqual(2);
    expect(settings.profiles[0].provider).toBe("volcengine");
    expect(settings.profiles[1].provider).toBe("minimax");
  });

  it("saves and loads profiles", async () => {
    const profiles: VoiceProfile[] = [
      {
        id: "test-1",
        name: "Test Profile",
        provider: "volcengine",
        volcengine: { ...DEFAULT_VOLCENGINE, apiKey: "test-key" },
        minimax: { ...DEFAULT_MINIMAX },
      },
    ];
    await saveAppSettings({ profiles, activeProfileId: "test-1" });
    const loaded = await getAppSettings();
    expect(loaded.profiles.length).toBe(1);
    expect(loaded.profiles[0].name).toBe("Test Profile");
    expect(loaded.profiles[0].volcengine.apiKey).toBe("test-key");
    expect(loaded.activeProfileId).toBe("test-1");
  });

  it("migrates legacy flat settings to profiles", async () => {
    await chrome.storage.sync.set({
      tts_settings: {
        provider: "volcengine",
        apiKey: "legacy-key",
        voiceType: "legacy-voice",
        volcengine: {
          apiKey: "legacy-key",
          resourceId: "seed-tts-2.0",
          voiceType: "legacy-voice",
          speechRate: 5,
          loudnessRate: 0,
        },
      },
    });

    const settings = await getAppSettings();
    expect(settings.profiles.length).toBeGreaterThanOrEqual(1);
    expect(settings.profiles[0].volcengine.apiKey).toBe("legacy-key");
  });

  it("getSettings returns active profile as TTSSettings", async () => {
    const profile: VoiceProfile = {
      id: "active-test",
      name: "Active Test",
      provider: "minimax",
      volcengine: { ...DEFAULT_VOLCENGINE },
      minimax: { ...DEFAULT_MINIMAX, apiKey: "mm-key", voiceId: "test-voice" },
    };
    await saveAppSettings({ profiles: [profile], activeProfileId: "active-test" });

    const ttsSettings = await getSettings();
    expect(ttsSettings.provider).toBe("minimax");
    expect(ttsSettings.minimax.apiKey).toBe("mm-key");
    expect(ttsSettings.minimax.voiceId).toBe("test-voice");
  });

  it("saves profiles correctly", async () => {
    const profiles: VoiceProfile[] = [
      {
        id: "p1",
        name: "Profile 1",
        provider: "volcengine",
        volcengine: { ...DEFAULT_VOLCENGINE, apiKey: "key-1" },
        minimax: { ...DEFAULT_MINIMAX },
      },
    ];
    await saveProfiles(profiles);
    const loaded = await getAppSettings();
    expect(loaded.profiles.length).toBe(1);
    expect(loaded.profiles[0].volcengine.apiKey).toBe("key-1");
  });

  it("migrates legacy active translation profile to selected ids", async () => {
    const profiles: TranslationProfile[] = [
      {
        id: "translation-1",
        name: "Translation 1",
        provider: "minimax",
        minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
        siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
      },
      {
        id: "translation-2",
        name: "Translation 2",
        provider: "siliconflow",
        minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
        siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
      },
    ];

    await chrome.storage.sync.set({
      translation_profiles: profiles,
      translation_settings: { activeTranslationProfileId: "translation-2" },
    });

    const loaded = await getTranslationSettings();
    expect(loaded.activeTranslationProfileIds).toEqual(["translation-2"]);
  });
});
