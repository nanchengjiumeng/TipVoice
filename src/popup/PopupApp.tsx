import { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "../shared/types.ts";
import { getAppSettings, saveActiveProfileId, onSettingsChanged } from "../shared/storage.ts";
import { PROVIDER_LABELS } from "../shared/constants.ts";
import { Button, Card, Chip } from "@heroui/react";

export function PopupApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void getAppSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  const handleSetActive = useCallback(
    async (profileId: string) => {
      if (!settings) return;
      await saveActiveProfileId(profileId);
      setSettings({ ...settings, activeProfileId: profileId });
    },
    [settings],
  );

  const openManager = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });
  };

  if (!settings) {
    return <div className="w-80 p-4 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  const active = settings.profiles.find((p) => p.id === settings.activeProfileId);

  return (
    <div className="w-80 p-4 space-y-3">
      <header className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <img src="icons/icon-128.png" width="20" height="20" />
        <h1 className="text-base font-bold text-gray-800 flex-1">Tip Voice</h1>
        <Button variant="primary" size="sm" onPress={openManager}>
          管理方案
        </Button>
      </header>

      {active && (
        <Card className="border border-green-200 bg-green-50">
          <Card.Content className="py-2.5 px-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 truncate">{active.name}</div>
                <div className="text-xs text-gray-500">
                  {PROVIDER_LABELS[active.provider]}
                  {active.provider === "volcengine"
                    ? ` · ${active.volcengine.voiceType}`
                    : ` · ${active.minimax.voiceId}`}
                </div>
              </div>
              <Chip size="sm" color="success" variant="soft" className="ml-2">
                使用中
              </Chip>
            </div>
          </Card.Content>
        </Card>
      )}

      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase">选择方案</h3>
        {settings.profiles.map((p) => (
          <Card
            key={p.id}
            className={`cursor-pointer ${p.id === settings.activeProfileId ? "border-primary-300 bg-primary-50" : "hover:border-gray-300"}`}
          >
            <Card.Content className="py-2.5 px-3" onClick={() => void handleSetActive(p.id)}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-400">{PROVIDER_LABELS[p.provider]}</div>
                </div>
                {p.id === settings.activeProfileId && (
                  <span className="text-primary-500 text-lg ml-1.5">✓</span>
                )}
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
