import { describe, expect, it } from "vite-plus/test";
import { VolcengineProvider } from "../src/lib/volcengine-provider.ts";
import { DEFAULT_SETTINGS } from "../src/shared/constants.ts";
import type { TTSSettings } from "../src/shared/types.ts";

const API_KEY = import.meta.env["VITE_API_KEY"] ?? "";

const volcengineProvider = new VolcengineProvider();

describe.skipIf(!API_KEY)("e2e: Volcengine TTS API", () => {
  it("synthesizes Chinese text and receives audio chunks", { timeout: 30_000 }, async () => {
    const settings: TTSSettings = {
      ...DEFAULT_SETTINGS,
      volcengine: {
        ...DEFAULT_SETTINGS.volcengine,
        apiKey: API_KEY,
      },
    };

    const chunks: Uint8Array[] = [];
    await volcengineProvider.synthesizeStream(settings, "你好，这是一个测试。", (chunk) => {
      chunks.push(chunk);
    });

    expect(chunks.length).toBeGreaterThan(0);

    const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalBytes).toBeGreaterThan(100);

    const firstByte = chunks[0][0];
    const isId3 = chunks[0][0] === 0x49 && chunks[0][1] === 0x44 && chunks[0][2] === 0x33;
    const isMp3Frame = firstByte === 0xff;
    expect(isId3 || isMp3Frame).toBe(true);
  });

  it("synthesizes English text with English voice", { timeout: 30_000 }, async () => {
    const settings: TTSSettings = {
      ...DEFAULT_SETTINGS,
      volcengine: {
        ...DEFAULT_SETTINGS.volcengine,
        apiKey: API_KEY,
        voiceType: "en_male_tim_uranus_bigtts",
      },
    };

    const chunks: Uint8Array[] = [];
    await volcengineProvider.synthesizeStream(settings, "Hello, this is a test.", (chunk) => {
      chunks.push(chunk);
    });

    expect(chunks.length).toBeGreaterThan(0);
    const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalBytes).toBeGreaterThan(100);
  });

  it("supports abort cancellation mid-stream", { timeout: 30_000 }, async () => {
    const settings: TTSSettings = {
      ...DEFAULT_SETTINGS,
      volcengine: {
        ...DEFAULT_SETTINGS.volcengine,
        apiKey: API_KEY,
      },
    };

    const controller = new AbortController();
    let chunkCount = 0;

    const promise = volcengineProvider.synthesizeStream(
      settings,
      "这是一段较长的文本，用于测试中途取消功能。我们希望在收到一些音频数据后立即中止请求。",
      () => {
        chunkCount++;
        if (chunkCount >= 1) {
          controller.abort();
        }
      },
      controller.signal,
    );

    await expect(promise).rejects.toThrow();
    expect(chunkCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects with error for invalid API key", { timeout: 30_000 }, async () => {
    const settings: TTSSettings = {
      ...DEFAULT_SETTINGS,
      volcengine: {
        ...DEFAULT_SETTINGS.volcengine,
        apiKey: "invalid-key-12345",
      },
    };

    await expect(volcengineProvider.synthesizeStream(settings, "测试", () => {})).rejects.toThrow();
  });
});
