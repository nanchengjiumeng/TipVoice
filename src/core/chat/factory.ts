import type { ChatProvider, ChatProviderFactory } from "./provider.ts";
import type { ChatProviderConfig, ChatProviderId } from "./types.ts";
import { MinimaxChatProvider } from "./providers/minimax.ts";
import { SiliconFlowChatProvider } from "./providers/siliconflow.ts";
import { OpenAIChatProvider } from "./providers/openai.ts";

const registry = new Map<ChatProviderId, ChatProviderFactory>([
  ["minimax", (config) => new MinimaxChatProvider(config)],
  ["siliconflow", (config) => new SiliconFlowChatProvider(config)],
  ["openai", (config) => new OpenAIChatProvider(config)],
]);

export function registerChatProvider(id: ChatProviderId, factory: ChatProviderFactory): void {
  registry.set(id, factory);
}

export function getChatProvider(id: ChatProviderId, config: ChatProviderConfig): ChatProvider {
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(`Unknown chat provider: ${id}. Available: ${[...registry.keys()].join(", ")}`);
  }
  return factory(config);
}

export function listChatProviders(): ChatProviderId[] {
  return [...registry.keys()];
}
