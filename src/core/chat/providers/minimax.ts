import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "../types.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";

const MINIMAX_CHAT_URL = "https://api.minimaxi.com/v1/chat/completions";

export const MINIMAX_CHAT_MODELS = [
  { label: "MiniMax-M2.7", value: "MiniMax-M2.7" as const },
  { label: "MiniMax-M2.7-highspeed", value: "MiniMax-M2.7-highspeed" as const },
  { label: "MiniMax-M2.5", value: "MiniMax-M2.5" as const },
  { label: "MiniMax-M2.1", value: "MiniMax-M2.1" as const },
] as const;

export class MinimaxChatProvider implements ChatProvider {
  readonly id = "minimax";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ChatProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? MINIMAX_CHAT_URL;
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    return chatOpenAICompatible(this.baseUrl, this.apiKey, request, "MiniMax", signal);
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
      "MiniMax",
      onChunk,
      signal,
    );
  }
}
