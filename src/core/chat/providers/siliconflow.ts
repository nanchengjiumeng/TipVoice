import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "../types.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";

const SILICONFLOW_CHAT_URL = "https://api.siliconflow.cn/v1/chat/completions";
const SILICONFLOW_MODELS_URL = "https://api.siliconflow.cn/v1/models";

export interface SiliconflowModel {
  id: string;
  object: string;
  owned_by: string;
}

/**
 * Fetch available chat models from SiliconFlow API.
 * Only returns models that look like chat/text models (excludes image/audio models).
 */
export async function fetchSiliconflowModels(apiKey: string): Promise<SiliconflowModel[]> {
  const res = await fetch(SILICONFLOW_MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: { object: string; data: SiliconflowModel[] } = await res.json();
  /* Filter to chat/text models only (heuristic: exclude common image/audio prefixes) */
  return (json.data ?? []).filter((m) => {
    const id = m.id.toLowerCase();
    return (
      !id.includes("stable-diffusion") &&
      !id.includes("flux") &&
      !id.includes("playground") &&
      !id.includes("kolors") &&
      !id.includes("deepfloyd") &&
      !id.includes("audioldm") &&
      !id.includes("bark") &&
      !id.includes("music") &&
      !id.includes("tts")
    );
  });
}

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
