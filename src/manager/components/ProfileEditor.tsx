import { useState, useCallback, useEffect } from "react";
import type { VoiceProfile, TTSProviderId } from "../../shared/types.ts";
import {
  PROVIDER_LABELS,
  VOLCENGINE_VOICE_PRESETS,
  MINIMAX_MODELS,
  MINIMAX_SAMPLE_RATES,
  MINIMAX_AUDIO_FORMATS,
} from "../../shared/constants.ts";
import { useMinimaxVoices } from "./useMinimaxVoices.ts";
import { Button, Card, Label, Input, TextField, Select, ListBox, Slider } from "@heroui/react";

interface Props {
  profile: VoiceProfile;
  onSave: (profile: VoiceProfile) => Promise<void>;
}

const DEV_VOLCENGINE_KEY = import.meta.env.DEV ? import.meta.env.VITE_API_KEY : "";
const DEV_MINIMAX_KEY = import.meta.env.DEV ? import.meta.env.VITE_API_KEY_MINIMAX : "";

export function ProfileEditor({ profile, onSave }: Props) {
  const [local, setLocal] = useState<VoiceProfile>(() => {
    const initial = {
      ...profile,
      volcengine: { ...profile.volcengine },
      minimax: { ...profile.minimax },
    };
    if (import.meta.env.DEV && profile.id.startsWith("default-")) {
      if (!profile.volcengine.apiKey && DEV_VOLCENGINE_KEY) {
        initial.volcengine.apiKey = DEV_VOLCENGINE_KEY;
      }
      if (!profile.minimax.apiKey && DEV_MINIMAX_KEY) {
        initial.minimax.apiKey = DEV_MINIMAX_KEY;
      }
    }
    return initial;
  });
  const [saved, setSaved] = useState(false);
  const {
    voices: minimaxVoices,
    loading: voicesLoading,
    error: voicesError,
    refetch: refetchVoices,
  } = useMinimaxVoices(local.minimax.apiKey);

  useEffect(() => {
    if (
      import.meta.env.DEV &&
      profile.id.startsWith("default-") &&
      profile.volcengine.apiKey !== DEV_VOLCENGINE_KEY &&
      DEV_VOLCENGINE_KEY
    ) {
      setLocal((prev) => ({
        ...prev,
        volcengine: { ...prev.volcengine, apiKey: DEV_VOLCENGINE_KEY },
      }));
    }
    if (
      import.meta.env.DEV &&
      profile.id.startsWith("default-") &&
      profile.minimax.apiKey !== DEV_MINIMAX_KEY &&
      DEV_MINIMAX_KEY
    ) {
      setLocal((prev) => ({
        ...prev,
        minimax: { ...prev.minimax, apiKey: DEV_MINIMAX_KEY },
      }));
    }
  }, [profile]);

  const update = useCallback(<K extends keyof VoiceProfile>(key: K, value: VoiceProfile[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const updateVolcengine = useCallback(
    <K extends keyof VoiceProfile["volcengine"]>(key: K, value: VoiceProfile["volcengine"][K]) => {
      setLocal((prev) => ({ ...prev, volcengine: { ...prev.volcengine, [key]: value } }));
      setSaved(false);
    },
    [],
  );

  const updateMinimax = useCallback(
    <K extends keyof VoiceProfile["minimax"]>(key: K, value: VoiceProfile["minimax"][K]) => {
      setLocal((prev) => ({ ...prev, minimax: { ...prev.minimax, [key]: value } }));
      setSaved(false);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    await onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [local, onSave]);

  const isCustomVolcVoice = !VOLCENGINE_VOICE_PRESETS.some(
    (v) => v.value === local.volcengine.voiceType,
  );
  const isCustomMinimaxVoice = !minimaxVoices.some((v) => v.value === local.minimax.voiceId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">编辑方案</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              已保存
            </span>
          )}
          <Button variant="primary" size="sm" onPress={handleSave}>
            保存
          </Button>
        </div>
      </div>

      <Card>
        <Card.Content className="p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">基本信息</h3>
          <TextField fullWidth>
            <Label className="text-xs">方案名称</Label>
            <Input
              value={local.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
            />
          </TextField>
          <Select
            fullWidth
            selectedKey={local.provider}
            onSelectionChange={(key) => {
              if (key) update("provider", String(key) as TTSProviderId);
            }}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <ListBox.Item key={value} id={value}>
                    {label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Card.Content>
      </Card>

      {local.provider === "volcengine" ? (
        <Card>
          <Card.Content className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              火山引擎
            </h3>
            <TextField fullWidth>
              <Label className="text-xs">
                API Key (
                <a
                  href="https://console.volcengine.com/speech/new/setting/apikeys"
                  target="_blank"
                  className="text-primary-500 hover:underline"
                >
                  获取密钥
                </a>
                )
              </Label>
              <Input
                type="password"
                value={local.volcengine.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateVolcengine("apiKey", e.target.value)
                }
                placeholder="输入火山引擎 API Key"
              />
            </TextField>
            <TextField fullWidth>
              <Label className="text-xs">Resource ID</Label>
              <Input
                value={local.volcengine.resourceId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateVolcengine("resourceId", e.target.value)
                }
              />
            </TextField>
            <Select
              fullWidth
              selectedKey={isCustomVolcVoice ? "__custom__" : local.volcengine.voiceType}
              onSelectionChange={(key) => {
                if (key && String(key) !== "__custom__") updateVolcengine("voiceType", String(key));
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {VOLCENGINE_VOICE_PRESETS.map((v) => (
                    <ListBox.Item key={v.value} id={v.value}>
                      {v.label}
                    </ListBox.Item>
                  ))}
                  <ListBox.Item key="__custom__" id="__custom__">
                    自定义
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            {isCustomVolcVoice && (
              <TextField fullWidth>
                <Label className="text-xs">Custom Voice ID</Label>
                <Input
                  value={local.volcengine.voiceType}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateVolcengine("voiceType", e.target.value)
                  }
                />
              </TextField>
            )}
            <Slider
              minValue={-50}
              maxValue={100}
              step={1}
              defaultValue={local.volcengine.speechRate}
              onChange={(value) => updateVolcengine("speechRate", Number(value))}
            >
              <div className="flex justify-between text-xs">
                <Label className="text-xs">语速</Label>
                <Slider.Output />
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <Slider
              minValue={-50}
              maxValue={100}
              step={1}
              defaultValue={local.volcengine.loudnessRate}
              onChange={(value) => updateVolcengine("loudnessRate", Number(value))}
            >
              <div className="flex justify-between text-xs">
                <Label className="text-xs">音量</Label>
                <Slider.Output />
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MiniMax</h3>
            <TextField fullWidth>
              <Label className="text-xs">
                API Key (
                <a
                  href="https://platform.minimaxi.com/api-keys"
                  target="_blank"
                  className="text-primary-500 hover:underline"
                >
                  获取密钥
                </a>
                )
              </Label>
              <Input
                type="password"
                value={local.minimax.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateMinimax("apiKey", e.target.value)
                }
                placeholder="输入 MiniMax API Key"
              />
            </TextField>
            <Select
              fullWidth
              selectedKey={local.minimax.model}
              onSelectionChange={(key) => {
                if (key) updateMinimax("model", String(key) as VoiceProfile["minimax"]["model"]);
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {MINIMAX_MODELS.map((m) => (
                    <ListBox.Item key={m.value} id={m.value}>
                      {m.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Label className="text-xs">音色</Label>
                <Button
                  variant="secondary"
                  size="sm"
                  isDisabled={voicesLoading || !local.minimax.apiKey}
                  onPress={refetchVoices}
                  isIconOnly
                >
                  ↻
                </Button>
              </div>
              <Select
                fullWidth
                selectedKey={isCustomMinimaxVoice ? "__custom__" : local.minimax.voiceId}
                onSelectionChange={(key) => {
                  if (key && String(key) !== "__custom__") updateMinimax("voiceId", String(key));
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {minimaxVoices.map((v) => (
                      <ListBox.Item key={v.value} id={v.value}>
                        {v.description ? `${v.label} - ${v.description}` : v.label}
                      </ListBox.Item>
                    ))}
                    <ListBox.Item key="__custom__" id="__custom__">
                      自定义
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
              {voicesError && (
                <p className="text-xs text-red-500 mt-0.5">获取音色失败: {voicesError}</p>
              )}
            </div>
            {isCustomMinimaxVoice && (
              <TextField fullWidth>
                <Label className="text-xs">Voice ID</Label>
                <Input
                  value={local.minimax.voiceId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateMinimax("voiceId", e.target.value)
                  }
                  placeholder="e.g. male-qn-qingse"
                />
              </TextField>
            )}
            <Slider
              minValue={0.5}
              maxValue={2}
              step={0.1}
              defaultValue={local.minimax.speed}
              onChange={(value) => updateMinimax("speed", Number(value))}
            >
              <div className="flex justify-between text-xs">
                <Label className="text-xs">语速</Label>
                <Slider.Output />
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <Slider
              minValue={0.1}
              maxValue={10}
              step={0.1}
              defaultValue={local.minimax.vol}
              onChange={(value) => updateMinimax("vol", Number(value))}
            >
              <div className="flex justify-between text-xs">
                <Label className="text-xs">音量</Label>
                <Slider.Output />
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <Slider
              minValue={-12}
              maxValue={12}
              step={1}
              defaultValue={local.minimax.pitch}
              onChange={(value) => updateMinimax("pitch", Number(value))}
            >
              <div className="flex justify-between text-xs">
                <Label className="text-xs">语调</Label>
                <Slider.Output />
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <Select
              fullWidth
              selectedKey={String(local.minimax.sampleRate)}
              onSelectionChange={(key) => {
                if (key) updateMinimax("sampleRate", Number(key));
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {MINIMAX_SAMPLE_RATES.map((sr) => (
                    <ListBox.Item key={String(sr)} id={String(sr)}>
                      {sr} Hz
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              fullWidth
              selectedKey={local.minimax.audioFormat}
              onSelectionChange={(key) => {
                if (key)
                  updateMinimax(
                    "audioFormat",
                    String(key) as VoiceProfile["minimax"]["audioFormat"],
                  );
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {MINIMAX_AUDIO_FORMATS.map((f) => (
                    <ListBox.Item key={f.value} id={f.value}>
                      {f.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
