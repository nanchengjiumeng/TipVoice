import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "./types.ts";

export interface ChatProvider {
  readonly id: string;

  chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;

  chatStream(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
    signal?: AbortSignal,
  ): Promise<string>;
}

export type ChatProviderFactory = (config: ChatProviderConfig) => ChatProvider;
