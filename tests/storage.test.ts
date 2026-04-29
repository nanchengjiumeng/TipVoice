import { describe, expect, it, beforeEach } from "vite-plus/test";
import { getSettings, saveSettings, onSettingsChanged } from "../src/shared/storage.ts";
import { DEFAULT_SETTINGS } from "../src/shared/constants.ts";
import { resetChromeStorage } from "./setup.ts";

describe("storage", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("returns default settings when storage is empty", async () => {
    const settings = await getSettings();
    // API keys may be auto-filled from env vars in dev mode
    expect(settings.provider).toBe("volcengine");
    expect(settings.volcengine.resourceId).toBe("seed-tts-2.0");
    expect(settings.minimax.model).toBe("speech-2.8-turbo");
  });

  it("merges stored partial settings with defaults", async () => {
    await chrome.storage.sync.set({
      tts_settings: { volcengine: { apiKey: "test-key" } },
    });

    const settings = await getSettings();
    expect(settings.volcengine.apiKey).toBe("test-key");
    expect(settings.volcengine.resourceId).toBe("seed-tts-2.0");
    expect(settings.volcengine.voiceType).toBe("zh_male_wennuanahu_uranus_bigtts");
  });

  it("saves nested provider settings", async () => {
    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "my-key" },
    });
    const settings = await getSettings();
    expect(settings.volcengine.apiKey).toBe("my-key");
    expect(settings.volcengine.voiceType).toBe("zh_male_wennuanahu_uranus_bigtts");
  });

  it("updates existing settings without losing others", async () => {
    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "key1" },
    });
    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "key1", speechRate: 10 },
    });

    const settings = await getSettings();
    expect(settings.volcengine.apiKey).toBe("key1");
    expect(settings.volcengine.speechRate).toBe(10);
  });

  it("saves minimax settings independently", async () => {
    await saveSettings({
      minimax: { ...DEFAULT_SETTINGS.minimax, apiKey: "minimax-key" },
    });
    const settings = await getSettings();
    expect(settings.minimax.apiKey).toBe("minimax-key");
    expect(settings.provider).toBe("volcengine");
  });

  it("switches provider", async () => {
    await saveSettings({ provider: "minimax" });
    const settings = await getSettings();
    expect(settings.provider).toBe("minimax");
  });

  it("migrates legacy flat settings to nested volcengine", async () => {
    await chrome.storage.sync.set({
      tts_settings: {
        apiKey: "legacy-key",
        voiceType: "legacy-voice",
        speechRate: 5,
      },
    });

    const settings = await getSettings();
    expect(settings.volcengine.apiKey).toBe("legacy-key");
    expect(settings.volcengine.voiceType).toBe("legacy-voice");
    expect(settings.volcengine.speechRate).toBe(5);
  });

  it("notifies listeners on settings change", async () => {
    let notified = false;
    const unsub = onSettingsChanged((settings) => {
      notified = true;
      expect(settings.volcengine.apiKey).toBe("changed");
    });

    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "changed" },
    });
    expect(notified).toBe(true);

    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    let callCount = 0;
    const unsub = onSettingsChanged(() => {
      callCount++;
    });

    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "a" },
    });
    unsub();
    await saveSettings({
      volcengine: { ...DEFAULT_SETTINGS.volcengine, apiKey: "b" },
    });

    expect(callCount).toBe(1);
  });
});
