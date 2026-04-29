import type { TTSSettings } from "../../shared/types.ts";
import { PROVIDER_LABELS } from "../../shared/constants.ts";
import type { TTSProviderId } from "../../shared/types.ts";

interface Props {
  settings: TTSSettings;
  onUpdate: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
}

export function CredentialsSection({ settings, onUpdate }: Props) {
  return (
    <section className="section">
      <h3>服务配置</h3>
      <label className="field">
        <span>TTS 服务商</span>
        <select
          value={settings.provider}
          onChange={(e) => onUpdate("provider", e.target.value as TTSProviderId)}
        >
          {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {settings.provider === "volcengine" ? (
        <label className="field">
          <span>
            API Key (
            <a href="https://console.volcengine.com/speech/new/setting/apikeys" target="_blank">
              获取密钥
            </a>
            )
          </span>
          <input
            type="password"
            value={settings.volcengine.apiKey}
            onChange={(e) =>
              onUpdate("volcengine", { ...settings.volcengine, apiKey: e.target.value })
            }
            placeholder="输入火山引擎 API Key"
          />
        </label>
      ) : (
        <label className="field">
          <span>
            API Key (
            <a href="https://platform.minimaxi.com/api-keys" target="_blank">
              获取密钥
            </a>
            )
          </span>
          <input
            type="password"
            value={settings.minimax.apiKey}
            onChange={(e) => onUpdate("minimax", { ...settings.minimax, apiKey: e.target.value })}
            placeholder="输入 MiniMax API Key"
          />
        </label>
      )}
    </section>
  );
}
