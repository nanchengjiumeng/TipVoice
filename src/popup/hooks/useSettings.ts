import { useCallback, useEffect, useRef, useState } from "react";
import type { TTSSettings } from "../../shared/types.ts";
import { getSettings, saveSettings } from "../../shared/storage.ts";
import { DEFAULT_SETTINGS } from "../../shared/constants.ts";

function deepCloneDefaults(): TTSSettings {
  return {
    ...DEFAULT_SETTINGS,
    volcengine: { ...DEFAULT_SETTINGS.volcengine },
    minimax: { ...DEFAULT_SETTINGS.minimax },
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<TTSSettings>(deepCloneDefaults);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateSetting = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };

        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveSettings(updated).then(() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          });
        }, 300);

        return updated;
      });
    },
    [],
  );

  return { settings, loading, saved, updateSetting };
}
