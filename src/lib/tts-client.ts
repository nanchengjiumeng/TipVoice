import type { TTSSettings } from "../shared/types.ts";
import type { TTSProvider } from "./provider.ts";
import { VolcengineProvider } from "./volcengine-provider.ts";
import { MinimaxProvider } from "./minimax-provider.ts";

const providers: Record<string, TTSProvider> = {
  volcengine: new VolcengineProvider(),
  minimax: new MinimaxProvider(),
};

export function getProvider(settings: TTSSettings): TTSProvider {
  const provider = providers[settings.provider];
  if (!provider) {
    throw new Error(`Unknown TTS provider: ${settings.provider}`);
  }
  return provider;
}
