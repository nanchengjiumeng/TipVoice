import type { TTSSettings } from "../../shared/types.ts";
import { VOICE_PRESETS } from "../../shared/constants.ts";

interface Props {
  settings: TTSSettings;
  onUpdate: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
}

export function VoiceSettings({ settings, onUpdate }: Props) {
  const isCustomVoice = !VOICE_PRESETS.some((v) => v.value === settings.voiceType);

  return (
    <section className="section">
      <h3>声音配置</h3>
      <label className="field">
        <span>音色</span>
        <select
          value={isCustomVoice ? "__custom__" : settings.voiceType}
          onChange={(e) => {
            if (e.target.value !== "__custom__") {
              onUpdate("voiceType", e.target.value);
            }
          }}
        >
          {VOICE_PRESETS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
          <option value="__custom__">Custom</option>
        </select>
      </label>
      {isCustomVoice && (
        <label className="field">
          <span>Custom Voice ID</span>
          <input
            type="text"
            value={settings.voiceType}
            onChange={(e) => onUpdate("voiceType", e.target.value)}
            placeholder="e.g. BV700_streaming"
          />
        </label>
      )}
      <label className="field">
        <span>语速 ({settings.speechRate})</span>
        <input
          type="range"
          min="-50"
          max="100"
          step="1"
          value={settings.speechRate}
          onChange={(e) => onUpdate("speechRate", Number(e.target.value))}
        />
      </label>
      <label className="field">
        <span>音量 ({settings.loudnessRate})</span>
        <input
          type="range"
          min="-50"
          max="100"
          step="1"
          value={settings.loudnessRate}
          onChange={(e) => onUpdate("loudnessRate", Number(e.target.value))}
        />
      </label>
    </section>
  );
}
