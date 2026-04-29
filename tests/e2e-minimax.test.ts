import { describe, expect, it } from "vite-plus/test";
import { MinimaxProvider } from "../src/lib/minimax-provider.ts";
import { DEFAULT_SETTINGS } from "../src/shared/constants.ts";
import type { TTSSettings } from "../src/shared/types.ts";

const MINIMAX_API_KEY = import.meta.env["VITE_API_KEY_MINIMAX"] ?? "";

const minimaxProvider = new MinimaxProvider();

function getMinimaxSettings(overrides?: Partial<TTSSettings["minimax"]>): TTSSettings {
  return {
    ...DEFAULT_SETTINGS,
    provider: "minimax",
    minimax: {
      ...DEFAULT_SETTINGS.minimax,
      apiKey: MINIMAX_API_KEY,
      ...overrides,
    },
  };
}

describe.skipIf(!MINIMAX_API_KEY)("e2e: MiniMax HTTP TTS API", () => {
  it("synthesizes Chinese text and receives audio chunks", { timeout: 30_000 }, async () => {
    const settings = getMinimaxSettings();
    const chunks: Uint8Array[] = [];

    try {
      await minimaxProvider.synthesizeStream(settings, "你好，这是一个测试。", (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
      const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
      expect(totalBytes).toBeGreaterThan(100);
    } catch (err) {
      // Account may have insufficient balance — verify the request reached the API
      if (err instanceof Error && err.message.includes("insufficient balance")) {
        console.warn("Skipping: MiniMax account has insufficient balance");
      } else {
        throw err;
      }
    }
  });

  it("synthesizes English text", { timeout: 30_000 }, async () => {
    const settings = getMinimaxSettings({
      voiceId: "English_Graceful_Lady",
    });
    const chunks: Uint8Array[] = [];

    try {
      await minimaxProvider.synthesizeStream(settings, "Hello, this is a test.", (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
      const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
      expect(totalBytes).toBeGreaterThan(100);
    } catch (err) {
      if (err instanceof Error && err.message.includes("insufficient balance")) {
        console.warn("Skipping: MiniMax account has insufficient balance");
      } else {
        throw err;
      }
    }
  });

  it("rejects with error for invalid API key", { timeout: 15_000 }, async () => {
    const settings = getMinimaxSettings({ apiKey: "invalid-key-12345" });

    await expect(minimaxProvider.synthesizeStream(settings, "测试", () => {})).rejects.toThrow();
  });
});
