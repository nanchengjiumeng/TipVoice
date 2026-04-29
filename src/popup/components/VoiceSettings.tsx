import type { TTSSettings } from "../../shared/types.ts";
import {
  VOLCENGINE_VOICE_PRESETS,
  MINIMAX_MODELS,
  MINIMAX_SAMPLE_RATES,
  MINIMAX_AUDIO_FORMATS,
} from "../../shared/constants.ts";
import { useMinimaxVoices } from "../hooks/useMinimaxVoices.ts";

interface Props {
  settings: TTSSettings;
  onUpdate: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
}

export function VoiceSettings({ settings, onUpdate }: Props) {
  if (settings.provider === "minimax") {
    return <MinimaxVoiceSettings settings={settings} onUpdate={onUpdate} />;
  }
  return <VolcengineVoiceSettings settings={settings} onUpdate={onUpdate} />;
}

function VolcengineVoiceSettings({ settings, onUpdate }: Props) {
  const isCustomVoice = !VOLCENGINE_VOICE_PRESETS.some(
    (v) => v.value === settings.volcengine.voiceType,
  );

  return (
    <section className="section">
      <h3>声音配置</h3>
      <label className="field">
        <span>音色</span>
        <select
          value={isCustomVoice ? "__custom__" : settings.volcengine.voiceType}
          onChange={(e) => {
            if (e.target.value !== "__custom__") {
              onUpdate("volcengine", { ...settings.volcengine, voiceType: e.target.value });
            }
          }}
        >
          {VOLCENGINE_VOICE_PRESETS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
          <option value="__custom__">自定义</option>
        </select>
      </label>
      {isCustomVoice && (
        <label className="field">
          <span>Custom Voice ID</span>
          <input
            type="text"
            value={settings.volcengine.voiceType}
            onChange={(e) =>
              onUpdate("volcengine", { ...settings.volcengine, voiceType: e.target.value })
            }
            placeholder="e.g. BV700_streaming"
          />
        </label>
      )}
      <label className="field">
        <span>语速 ({settings.volcengine.speechRate})</span>
        <input
          type="range"
          min="-50"
          max="100"
          step="1"
          value={settings.volcengine.speechRate}
          onChange={(e) =>
            onUpdate("volcengine", { ...settings.volcengine, speechRate: Number(e.target.value) })
          }
        />
      </label>
      <label className="field">
        <span>音量 ({settings.volcengine.loudnessRate})</span>
        <input
          type="range"
          min="-50"
          max="100"
          step="1"
          value={settings.volcengine.loudnessRate}
          onChange={(e) =>
            onUpdate("volcengine", {
              ...settings.volcengine,
              loudnessRate: Number(e.target.value),
            })
          }
        />
      </label>
    </section>
  );
}

function MinimaxVoiceSettings({ settings, onUpdate }: Props) {
  const m = settings.minimax;
  const { voices, loading, error, refetch } = useMinimaxVoices(m.apiKey);
  const isCustomVoice = !voices.some((v) => v.value === m.voiceId);

  return (
    <section className="section">
      <h3>声音配置</h3>
      <label className="field">
        <span>模型</span>
        <select
          value={m.model}
          onChange={(e) => onUpdate("minimax", { ...m, model: e.target.value as typeof m.model })}
        >
          {MINIMAX_MODELS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>
          音色{" "}
          <button
            type="button"
            className="refresh-btn"
            onClick={refetch}
            disabled={loading || !m.apiKey}
            title="刷新音色列表"
          >
            {loading ? "…" : "↻"}
          </button>
        </span>
        <select
          value={isCustomVoice ? "__custom__" : m.voiceId}
          onChange={(e) => {
            if (e.target.value !== "__custom__") {
              onUpdate("minimax", { ...m, voiceId: e.target.value });
            }
          }}
        >
          {voices.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
              {v.description ? ` - ${v.description}` : ""}
            </option>
          ))}
          <option value="__custom__">自定义</option>
        </select>
        {error && <small className="error-hint">获取音色失败: {error}</small>}
      </label>
      {isCustomVoice && (
        <label className="field">
          <span>Voice ID</span>
          <input
            type="text"
            value={m.voiceId}
            onChange={(e) => onUpdate("minimax", { ...m, voiceId: e.target.value })}
            placeholder="e.g. male-qn-qingse"
          />
        </label>
      )}
      <label className="field">
        <span>语速 ({m.speed.toFixed(1)})</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={m.speed}
          onChange={(e) => onUpdate("minimax", { ...m, speed: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>音量 ({m.vol.toFixed(1)})</span>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={m.vol}
          onChange={(e) => onUpdate("minimax", { ...m, vol: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>语调 ({m.pitch})</span>
        <input
          type="range"
          min="-12"
          max="12"
          step="1"
          value={m.pitch}
          onChange={(e) => onUpdate("minimax", { ...m, pitch: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>采样率</span>
        <select
          value={m.sampleRate}
          onChange={(e) => onUpdate("minimax", { ...m, sampleRate: Number(e.target.value) })}
        >
          {MINIMAX_SAMPLE_RATES.map((sr) => (
            <option key={sr} value={sr}>
              {sr} Hz
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>音频格式</span>
        <select
          value={m.audioFormat}
          onChange={(e) =>
            onUpdate("minimax", { ...m, audioFormat: e.target.value as typeof m.audioFormat })
          }
        >
          {MINIMAX_AUDIO_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
