import type { TTSSettings } from "../../shared/types.ts";

interface Props {
  settings: TTSSettings;
  onUpdate: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
}

export function CredentialsSection({ settings, onUpdate }: Props) {
  return (
    <section className="section">
      <h3>API 配置</h3>
      <label className="field">
        <span>
          API Key (
          <a href="https://console.volcengine.com/speech/new/setting/apikeys" target="_blank">
            Apikeys控制台
          </a>
          )
        </span>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => onUpdate("apiKey", e.target.value)}
          placeholder="输入 API Key"
        />
      </label>
    </section>
  );
}
