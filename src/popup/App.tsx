import { useSettings } from "./hooks/useSettings.ts";
import { CredentialsSection } from "./components/CredentialsSection.tsx";
import { VoiceSettings } from "./components/VoiceSettings.tsx";
import { PROVIDER_LABELS } from "../shared/constants.ts";

export function App() {
  const { settings, loading, saved, updateSetting } = useSettings();

  if (loading) {
    return <div className="popup loading">Loading...</div>;
  }

  const hasApiKey =
    settings.provider === "minimax" ? !!settings.minimax.apiKey : !!settings.volcengine.apiKey;

  return (
    <div className="popup">
      <header className="header">
        <img src="icons/icon-128.png" className="logo" width="20" height="20" />
        <h1>Tip Voice</h1>
        {saved && <span className="save-badge">Saved</span>}
      </header>

      <CredentialsSection settings={settings} onUpdate={updateSetting} />
      <VoiceSettings settings={settings} onUpdate={updateSetting} />

      {!hasApiKey && (
        <p className="warning">
          请配置 {PROVIDER_LABELS[settings.provider]} 的 API Key 以启用语音合成。
        </p>
      )}

      <button
        className="storage-link-btn"
        onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("storage.html") })}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M20 6H12L10 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H6v-2h8v2zm4-4H6v-2h12v2z" />
        </svg>
        管理语音缓存
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="arrow-icon">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>
  );
}
