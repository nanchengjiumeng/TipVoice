import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { TranslationProvider } from "../src/lib/translation-provider.ts";
import type { TranslationProfile } from "../src/shared/types.ts";
import {
  DEFAULT_MINIMAX_TRANSLATION,
  DEFAULT_SILICONFLOW_TRANSLATION,
} from "../src/shared/constants.ts";

const MINIMAX_API_KEY = import.meta.env["VITE_API_KEY_MINIMAX"] ?? "";
const SILICONFLOW_API_KEY = import.meta.env["VITE_API_KEY_SILICONFLOW"] ?? "";

const translationProvider = new TranslationProvider();

function requireEnv(name: string, value: string): string {
  if (!value) {
    throw new Error(`${name} must be set in .env for e2e translation tests`);
  }
  return value;
}

afterEach(() => {
  vi.restoreAllMocks();
});

function getMinimaxTranslationProfile(
  overrides?: Partial<TranslationProfile["minimax"]>,
): TranslationProfile {
  return {
    id: "test-minimax",
    name: "Test MiniMax",
    provider: "minimax",
    minimax: {
      ...DEFAULT_MINIMAX_TRANSLATION,
      apiKey: requireEnv("VITE_API_KEY_MINIMAX", MINIMAX_API_KEY),
      ...overrides,
    },
    siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
  };
}

function getSiliconflowTranslationProfile(
  overrides?: Partial<TranslationProfile["siliconflow"]>,
): TranslationProfile {
  return {
    id: "test-siliconflow-real",
    name: "Test SiliconFlow Real",
    provider: "siliconflow",
    minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
    siliconflow: {
      ...DEFAULT_SILICONFLOW_TRANSLATION,
      apiKey: requireEnv("VITE_API_KEY_SILICONFLOW", SILICONFLOW_API_KEY),
      ...overrides,
    },
  };
}

describe("e2e: MiniMax Translation API", () => {
  it("translates English to Chinese successfully", { timeout: 60_000 }, async () => {
    const profile = getMinimaxTranslationProfile();
    const text = "Hello, how are you today?";

    const result = await translationProvider.translate(profile, text);

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    console.log("Translation result:", result);
  });

  it("translates Chinese to English successfully", { timeout: 60_000 }, async () => {
    const profile = getMinimaxTranslationProfile({
      prompt: "Please translate the following text into English:",
    });
    const text = "你好，今天天气怎么样？";

    const result = await translationProvider.translate(profile, text);

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    console.log("Translation result:", result);
  });

  it("uses different MiniMax models", { timeout: 60_000 }, async () => {
    const profile = getMinimaxTranslationProfile({
      model: "MiniMax-M2.7",
    });
    const text = "This is a test.";

    const result = await translationProvider.translate(profile, text);

    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    console.log("MiniMax-M2.7-highspeed result:", result);
  });

  it("rejects with error for invalid API key", { timeout: 15_000 }, async () => {
    const profile = getMinimaxTranslationProfile({ apiKey: "invalid-key-12345" });

    await expect(translationProvider.translate(profile, "test")).rejects.toThrow();
  });
});

describe("e2e: SiliconFlow Translation API", () => {
  it("streams translation successfully", { timeout: 120_000 }, async () => {
    const profile = getSiliconflowTranslationProfile({
      model: "deepseek-ai/DeepSeek-V4-Flash",
      enableThinking: false,
      prompt: "Translate the English word to Chinese. Reply with only the translation.",
    });
    const chunks: string[] = [];
    const startedAt = Date.now();
    let firstChunkAt = 0;

    const result = await translationProvider.translateStream(profile, "millions", (chunk) => {
      if (!firstChunkAt) firstChunkAt = Date.now();
      chunks.push(chunk);
    });

    const summary = {
      provider: profile.provider,
      model: profile.siliconflow.model,
      chunkCount: chunks.length,
      firstChunkMs: firstChunkAt ? firstChunkAt - startedAt : null,
      totalMs: Date.now() - startedAt,
      resultPreview: result.slice(0, 200),
      completed: true,
    };
    console.log("SiliconFlow streaming e2e:", JSON.stringify(summary, null, 2));

    expect(result).toBeTruthy();
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("TranslationProvider unit tests", () => {
  it("throws TranslationApiError for API errors", async () => {
    const mockProfile: TranslationProfile = {
      id: "test",
      name: "Test",
      provider: "minimax",
      minimax: {
        apiKey: "",
        model: "MiniMax-M2.7",
        prompt: "Translate:",
      },
      siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
    };

    await expect(translationProvider.translate(mockProfile, "test")).rejects.toThrow();
  });

  it("routes SiliconFlow profiles through the chat API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200 },
      ),
    );
    const mockProfile: TranslationProfile = {
      id: "test-siliconflow",
      name: "Test SiliconFlow",
      provider: "siliconflow",
      minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
      siliconflow: {
        ...DEFAULT_SILICONFLOW_TRANSLATION,
        apiKey: "invalid-key-12345",
        enableThinking: true,
      },
    };

    await expect(translationProvider.translate(mockProfile, "test")).resolves.toBe("ok");
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") {
      throw new Error("Expected fetch request body to be a string");
    }
    const body = JSON.parse(requestBody) as Record<string, unknown>;
    expect(body.enable_thinking).toBe(true);
  });

  it("streams SiliconFlow translation chunks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode(
                'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n' +
                  'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
                  "data: [DONE]\n\n",
              ),
            );
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );
    const chunks: string[] = [];
    const mockProfile: TranslationProfile = {
      id: "test-siliconflow",
      name: "Test SiliconFlow",
      provider: "siliconflow",
      minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
      siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
    };

    await expect(
      translationProvider.translateStream(mockProfile, "test", (chunk) => chunks.push(chunk)),
    ).resolves.toBe("hello");
    expect(chunks).toEqual(["hel", "lo"]);
  });

  it("finishes streams when finish_reason is returned without DONE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode(
                'data: {"choices":[{"delta":{"content":"done"},"finish_reason":null}]}\n\n' +
                  'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
              ),
            );
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );
    const mockProfile: TranslationProfile = {
      id: "test-siliconflow",
      name: "Test SiliconFlow",
      provider: "siliconflow",
      minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
      siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
    };

    await expect(translationProvider.translateStream(mockProfile, "test", () => {})).resolves.toBe(
      "done",
    );
  });

  it("rejects stream when abort signal fires between chunks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"a"}}]}\n\n'));
          },
        }),
        { status: 200 },
      ),
    );
    const controller = new AbortController();
    const mockProfile: TranslationProfile = {
      id: "test-siliconflow",
      name: "Test SiliconFlow",
      provider: "siliconflow",
      minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
      siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
    };
    setTimeout(() => controller.abort(), 10);

    await expect(
      translationProvider.translateStream(mockProfile, "test", () => {}, controller.signal),
    ).rejects.toThrow();
  });

  it("handles abort signal correctly", async () => {
    const controller = new AbortController();
    const profile = getMinimaxTranslationProfile();

    controller.abort();

    await expect(
      translationProvider.translate(profile, "test", controller.signal),
    ).rejects.toThrow();
  });
});
