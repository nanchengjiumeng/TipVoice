import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "../types.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIChatProvider implements ChatProvider {
  readonly id = "openai";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ChatProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? OPENAI_CHAT_URL;
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    return chatOpenAICompatible(this.baseUrl, this.apiKey, request, "OpenAI", signal);
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
      "OpenAI",
      onChunk,
      signal,
    );
  }
}
