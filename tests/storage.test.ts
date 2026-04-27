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
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("merges stored partial settings with defaults", async () => {
    await chrome.storage.sync.set({
      tts_settings: { apiKey: "test-key" },
    });

    const settings = await getSettings();
    expect(settings.apiKey).toBe("test-key");
    expect(settings.resourceId).toBe("seed-tts-2.0");
    expect(settings.voiceType).toBe("zh_female_vv_uranus_bigtts");
  });

  it("saves partial settings merged with existing", async () => {
    await saveSettings({ apiKey: "my-key" });
    const settings = await getSettings();
    expect(settings.apiKey).toBe("my-key");
    expect(settings.voiceType).toBe("zh_female_vv_uranus_bigtts");
  });

  it("updates existing settings without losing others", async () => {
    await saveSettings({ apiKey: "key1" });
    await saveSettings({ speechRate: 10 });

    const settings = await getSettings();
    expect(settings.apiKey).toBe("key1");
    expect(settings.speechRate).toBe(10);
  });

  it("notifies listeners on settings change", async () => {
    let notified = false;
    const unsub = onSettingsChanged((settings) => {
      notified = true;
      expect(settings.apiKey).toBe("changed");
    });

    await saveSettings({ apiKey: "changed" });
    expect(notified).toBe(true);

    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    let callCount = 0;
    const unsub = onSettingsChanged(() => {
      callCount++;
    });

    await saveSettings({ apiKey: "a" });
    unsub();
    await saveSettings({ apiKey: "b" });

    expect(callCount).toBe(1);
  });
});
