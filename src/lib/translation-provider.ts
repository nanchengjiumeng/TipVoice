import type { TranslationProfile } from "../shared/types.ts";
import type {
  ChatProviderConfig,
  ChatProviderId,
  ChatRequest,
  ChatStreamChunk,
} from "../core/chat/types.ts";
import { getChatProvider } from "../core/chat/factory.ts";
import { ChatApiError, ChatNetworkError } from "../core/chat/errors.ts";

const log = (...args: unknown[]) => console.debug("[Tip Voice][translation-provider]", ...args);

export class TranslationApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "TranslationApiError";
    this.code = code;
  }
}

export class TranslationNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationNetworkError";
  }
}

function wrapTranslationError<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    if (err instanceof ChatApiError) {
      throw new TranslationApiError(err.code, err.message);
    }
    if (err instanceof ChatNetworkError) {
      throw new TranslationNetworkError(err.message);
    }
    throw err;
  });
}

export class TranslationProvider {
  async translateStream(
    profile: TranslationProfile,
    text: string,
    onChunk: (chunk: string, accumulated: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const { providerId, config, request } = this.buildChatRequest(profile, text);
    log("stream request start", {
      provider: profile.provider,
      model: request.model,
      textLength: text.length,
    });
    const chatProvider = getChatProvider(providerId, config);
    const adaptedOnChunk = (chunk: ChatStreamChunk, accumulated: string) => {
      if (chunk.content) {
        onChunk(chunk.content, accumulated);
      }
    };
    return wrapTranslationError(() => chatProvider.chatStream(request, adaptedOnChunk, signal));
  }

  async translate(
    profile: TranslationProfile,
    text: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const { providerId, config, request } = this.buildChatRequest(profile, text);
    log("translate request start", {
      provider: profile.provider,
      model: request.model,
      textLength: text.length,
    });
    const chatProvider = getChatProvider(providerId, config);
    const response = await wrapTranslationError(() => chatProvider.chat(request, signal));
    return response.content;
  }

  private buildChatRequest(
    profile: TranslationProfile,
    text: string,
  ): { providerId: ChatProviderId; config: ChatProviderConfig; request: ChatRequest } {
    const providerId = profile.provider as ChatProviderId;
    const messages = [
      { role: "system" as const, content: this.getPrompt(profile) },
      { role: "user" as const, content: text },
    ];

    if (profile.provider === "minimax") {
      return {
        providerId,
        config: { apiKey: profile.minimax.apiKey },
        request: {
          model: profile.minimax.model,
          messages,
        },
      };
    }

    // siliconflow
    const extra: Record<string, unknown> = {};
    if (profile.siliconflow.enableThinking !== undefined) {
      extra.enable_thinking = profile.siliconflow.enableThinking;
    }
    return {
      providerId,
      config: { apiKey: profile.siliconflow.apiKey },
      request: {
        model: profile.siliconflow.model,
        messages,
        extra: Object.keys(extra).length > 0 ? extra : undefined,
      },
    };
  }

  private getPrompt(profile: TranslationProfile): string {
    if (profile.provider === "minimax") {
      return profile.minimax.prompt;
    }
    return profile.siliconflow.prompt;
  }
}

export const translationProvider = new TranslationProvider();
