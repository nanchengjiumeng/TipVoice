import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "../types.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";

const SILICONFLOW_CHAT_URL = "https://api.siliconflow.cn/v1/chat/completions";

export const SILICONFLOW_CHAT_MODELS = [
  { label: "GLM-5 Pro", value: "Pro/zai-org/GLM-5" as const },
  { label: "DeepSeek-V4-Flash", value: "deepseek-ai/DeepSeek-V4-Flash" as const },
  { label: "GLM-4.7 Pro", value: "Pro/zai-org/GLM-4.7" as const },
  { label: "DeepSeek-V3.2", value: "deepseek-ai/DeepSeek-V3.2" as const },
  { label: "DeepSeek-V3.2 Pro", value: "Pro/deepseek-ai/DeepSeek-V3.2" as const },
  { label: "GLM-4.6", value: "zai-org/GLM-4.6" as const },
  { label: "Qwen3-8B", value: "Qwen/Qwen3-8B" as const },
  { label: "Qwen3-14B", value: "Qwen/Qwen3-14B" as const },
  { label: "Qwen3-32B", value: "Qwen/Qwen3-32B" as const },
  { label: "Qwen3-30B-A3B", value: "Qwen/Qwen3-30B-A3B" as const },
  { label: "Hunyuan-A13B-Instruct", value: "tencent/Hunyuan-A13B-Instruct" as const },
  { label: "GLM-4.5V", value: "zai-org/GLM-4.5V" as const },
  { label: "DeepSeek-V3.1-Terminus", value: "deepseek-ai/DeepSeek-V3.1-Terminus" as const },
  {
    label: "DeepSeek-V3.1-Terminus Pro",
    value: "Pro/deepseek-ai/DeepSeek-V3.1-Terminus" as const,
  },
  { label: "Qwen3.5-397B-A17B", value: "Qwen/Qwen3.5-397B-A17B" as const },
  { label: "Qwen3.5-122B-A10B", value: "Qwen/Qwen3.5-122B-A10B" as const },
  { label: "Qwen3.5-35B-A3B", value: "Qwen/Qwen3.5-35B-A3B" as const },
  { label: "Qwen3.5-27B", value: "Qwen/Qwen3.5-27B" as const },
  { label: "Qwen3.5-9B", value: "Qwen/Qwen3.5-9B" as const },
  { label: "Qwen3.5-4B", value: "Qwen/Qwen3.5-4B" as const },
] as const;

export class SiliconFlowChatProvider implements ChatProvider {
  readonly id = "siliconflow";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ChatProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? SILICONFLOW_CHAT_URL;
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    return chatOpenAICompatible(this.baseUrl, this.apiKey, request, "SiliconFlow", signal);
  }

  async chatStream(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    return chatOpenAICompatibleStream(
      this.baseUrl,
      this.apiKey,
      request,
      "SiliconFlow",
      onChunk,
      signal,
    );
  }
}
