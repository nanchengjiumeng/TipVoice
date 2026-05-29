import { useState, useCallback, useEffect, useRef } from "react";
import type { TranslationProfile } from "../../shared/types.ts";
import { TRANSLATION_PROVIDER_LABELS, MINIMAX_CHAT_MODELS } from "../../shared/constants.ts";
import {
  fetchSiliconflowModels,
  type SiliconflowModel,
} from "../../core/chat/providers/siliconflow.ts";
import { Button, Card, Checkbox, Label, Input, TextField, Select, ListBox } from "@heroui/react";

interface Props {
  profile: TranslationProfile;
  onSave: (profile: TranslationProfile) => Promise<void>;
}

const DEV_MINIMAX_KEY = import.meta.env.DEV ? import.meta.env.VITE_API_KEY_MINIMAX : "";
const DEV_SILICONFLOW_KEY = import.meta.env.DEV ? import.meta.env.VITE_API_KEY_SILICONFLOW : "";

export function TranslationProfileEditor({ profile, onSave }: Props) {
  const [local, setLocal] = useState<TranslationProfile>(() => {
    const initial = {
      ...profile,
      minimax: { ...profile.minimax },
      siliconflow: { ...profile.siliconflow },
    };
    if (import.meta.env.DEV) {
      if (!profile.minimax.apiKey && DEV_MINIMAX_KEY) {
        initial.minimax.apiKey = DEV_MINIMAX_KEY;
      }
      if (!profile.siliconflow.apiKey && DEV_SILICONFLOW_KEY) {
        initial.siliconflow.apiKey = DEV_SILICONFLOW_KEY;
      }
    }
    return initial;
  });
  const [saved, setSaved] = useState(false);
  const [sfModels, setSfModels] = useState<SiliconflowModel[]>([]);
  const [sfModelsLoading, setSfModelsLoading] = useState(false);
  const [sfModelsError, setSfModelsError] = useState<string | null>(null);
  const sfFetchRef = useRef(0);

  /* Fetch SiliconFlow models when apiKey changes */
  useEffect(() => {
    const key = local.siliconflow.apiKey.trim();
    if (!key) {
      setSfModels([]);
      setSfModelsError(null);
      return;
    }
    const fetchId = ++sfFetchRef.current;
    setSfModelsLoading(true);
    setSfModelsError(null);
    fetchSiliconflowModels(key)
      .then((models) => {
        if (fetchId !== sfFetchRef.current) return; /* stale */
        setSfModels(models);
        setSfModelsLoading(false);
      })
      .catch((err: unknown) => {
        if (fetchId !== sfFetchRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setSfModelsError(msg);
        setSfModels([]);
        setSfModelsLoading(false);
      });
  }, [local.siliconflow.apiKey]);

  useEffect(() => {
    if (import.meta.env.DEV && (DEV_MINIMAX_KEY || DEV_SILICONFLOW_KEY)) {
      setLocal((prev) => {
        let next = prev;
        if (!next.minimax.apiKey && DEV_MINIMAX_KEY) {
          next = {
            ...next,
            minimax: { ...next.minimax, apiKey: DEV_MINIMAX_KEY },
          };
        }
        if (!next.siliconflow.apiKey && DEV_SILICONFLOW_KEY) {
          next = {
            ...next,
            siliconflow: { ...next.siliconflow, apiKey: DEV_SILICONFLOW_KEY },
          };
        }
        return next;
      });
    }
  }, [profile.id]);

  const update = useCallback(
    <K extends keyof TranslationProfile>(key: K, value: TranslationProfile[K]) => {
      setLocal((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const updateMinimax = useCallback(
    <K extends keyof TranslationProfile["minimax"]>(
      key: K,
      value: TranslationProfile["minimax"][K],
    ) => {
      setLocal((prev) => ({ ...prev, minimax: { ...prev.minimax, [key]: value } }));
      setSaved(false);
    },
    [],
  );

  const updateSiliconflow = useCallback(
    <K extends keyof TranslationProfile["siliconflow"]>(
      key: K,
      value: TranslationProfile["siliconflow"][K],
    ) => {
      setLocal((prev) => ({
        ...prev,
        siliconflow: { ...prev.siliconflow, [key]: value },
      }));
      setSaved(false);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    await onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [local, onSave]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">编辑翻译方案</h2>
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
          <TextField fullWidth>
            <Label className="text-xs">服务商</Label>
            <Select
              fullWidth
              selectedKey={local.provider}
              onSelectionChange={(key) => {
                if (key) update("provider", String(key) as TranslationProfile["provider"]);
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {Object.entries(TRANSLATION_PROVIDER_LABELS).map(([value, label]) => (
                    <ListBox.Item key={value} id={value}>
                      {label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </TextField>
        </Card.Content>
      </Card>

      {local.provider === "minimax" ? (
        <Card>
          <Card.Content className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              MiniMax 配置
            </h3>
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
                if (key)
                  updateMinimax("model", String(key) as TranslationProfile["minimax"]["model"]);
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {MINIMAX_CHAT_MODELS.map((m) => (
                    <ListBox.Item key={m.value} id={m.value}>
                      {m.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField fullWidth>
              <Label className="text-xs">翻译提示词</Label>
              <textarea
                value={local.minimax.prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateMinimax("prompt", e.target.value)
                }
                placeholder="自定义翻译提示词"
                rows={5}
                className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </TextField>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              硅基流动配置
            </h3>
            <TextField fullWidth>
              <Label className="text-xs">
                API Key (
                <a
                  href="https://cloud.siliconflow.cn/account/ak"
                  target="_blank"
                  className="text-primary-500 hover:underline"
                >
                  获取密钥
                </a>
                )
              </Label>
              <Input
                type="password"
                value={local.siliconflow.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateSiliconflow("apiKey", e.target.value)
                }
                placeholder="输入硅基流动 API Key"
              />
            </TextField>
            <TextField fullWidth>
              <Label className="text-xs">
                模型
                {sfModelsLoading && <span className="ml-1 text-gray-400">加载中...</span>}
                {sfModelsError && <span className="ml-1 text-red-500">{sfModelsError}</span>}
              </Label>
              {local.siliconflow.apiKey.trim() && sfModels.length > 0 ? (
                <Select
                  fullWidth
                  selectedKey={local.siliconflow.model}
                  onSelectionChange={(key) => {
                    if (key)
                      updateSiliconflow(
                        "model",
                        String(key) as TranslationProfile["siliconflow"]["model"],
                      );
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {sfModels.map((m) => (
                        <ListBox.Item key={m.id} id={m.id}>
                          {m.id}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : (
                <Input
                  value={local.siliconflow.model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSiliconflow(
                      "model",
                      e.target.value as TranslationProfile["siliconflow"]["model"],
                    )
                  }
                  placeholder={
                    local.siliconflow.apiKey.trim() ? "加载模型列表..." : "先输入 API Key"
                  }
                />
              )}
            </TextField>
            <Checkbox
              isSelected={local.siliconflow.enableThinking}
              onChange={() =>
                updateSiliconflow("enableThinking", !local.siliconflow.enableThinking)
              }
            >
              <span className="text-xs text-gray-700">启用思考模式</span>
            </Checkbox>
            <TextField fullWidth>
              <Label className="text-xs">翻译提示词</Label>
              <textarea
                value={local.siliconflow.prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateSiliconflow("prompt", e.target.value)
                }
                placeholder="自定义翻译提示词"
                rows={5}
                className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </TextField>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
