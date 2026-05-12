export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  extra?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ChatStreamChunk {
  content: string;
  done: boolean;
}

export interface ChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export type ChatProviderId = "minimax" | "siliconflow" | "openai";
