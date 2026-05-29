import { describe, expect, it } from "vite-plus/test";
import { SiliconFlowChatProvider } from "../providers/siliconflow.ts";
import { DEFAULT_SILICONFLOW_MODEL } from "../../../shared/constants.ts";
import type { ChatRequest } from "../types.ts";

const VITE_API_KEY_SILICONFLOW = import.meta.env.VITE_API_KEY_SILICONFLOW as string | undefined;

function createProvider() {
  if (!VITE_API_KEY_SILICONFLOW) return null;
  return new SiliconFlowChatProvider({ apiKey: VITE_API_KEY_SILICONFLOW });
}

const MODEL = DEFAULT_SILICONFLOW_MODEL;

function createChatRequest(userContent: string): ChatRequest {
  return {
    model: MODEL,
    messages: [
      { role: "system", content: "你是一个有用的助手。请用中文简洁回答。" },
      { role: "user", content: userContent },
    ],
  };
}

describe("SiliconFlow API", () => {
  it("non-streaming chat should return a valid response", async () => {
    const provider = createProvider();
    if (!provider) {
      console.warn("VITE_API_KEY_SILICONFLOW is not set, skipping test.");
      return;
    }

    const request = createChatRequest("1+1等于几？只回答数字。");
    console.log("[e2e] non-streaming request:", JSON.stringify(request, null, 2));

    const response = await provider.chat(request, AbortSignal.timeout(30_000));

    console.log("[e2e] non-streaming response:");
    console.log("  model:", response.model);
    console.log("  content:", response.content);
    console.log("  usage:", response.usage);

    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.model).toBeTruthy();
  }, 30000);

  it("streaming chat should receive chunks and produce full output", async () => {
    const provider = createProvider();
    if (!provider) {
      console.warn("VITE_API_KEY_SILICONFLOW is not set, skipping test.");
      return;
    }

    const request = createChatRequest("用三句话介绍你自己。");
    console.log("[e2e] streaming request:", JSON.stringify(request, null, 2));

    const chunks: { content: string; accumulated: string }[] = [];
    let chunkIndex = 0;

    const result = await provider.chatStream(request, (chunk, accumulated) => {
      chunkIndex++;
      chunks.push({ content: chunk.content, accumulated });
      if (chunkIndex <= 3 || chunk.done) {
        console.log(
          `[e2e] chunk #${chunkIndex}:`,
          chunk.content,
          `(accumulated ${accumulated.length} chars)`,
        );
      }
    });

    console.log("\n[e2e] streaming complete:");
    console.log("  total chunks:", chunkIndex);
    console.log("  final result length:", result.length);
    console.log("  final result:", result);

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);
    expect(result).toBe(chunks[chunks.length - 1].accumulated);
  }, 30000);

  it("multi-turn conversation should maintain context", async () => {
    const provider = createProvider();
    if (!provider) {
      console.warn("VITE_API_KEY_SILICONFLOW is not set, skipping test.");
      return;
    }

    const request: ChatRequest = {
      model: MODEL,
      messages: [
        { role: "system", content: "你是一个有用的助手。请用中文简洁回答。" },
        { role: "user", content: "我最喜欢的颜色是蓝色，请记住。" },
        { role: "assistant", content: "好的，我记住了，你最喜欢的颜色是蓝色。" },
        { role: "user", content: "我最喜欢的颜色是什么？只回答颜色名称。" },
      ],
    };

    console.log("[e2e] multi-turn request:", JSON.stringify(request, null, 2));

    const response = await provider.chat(request);

    console.log("[e2e] multi-turn response:");
    console.log("  content:", response.content);

    expect(response.content).toBeTruthy();
    expect(response.content).toContain("蓝");
  }, 30000);

  it("invalid API key should throw authentication error", async () => {
    const provider = new SiliconFlowChatProvider({ apiKey: "sk-invalid-key-12345" });
    const request = createChatRequest("hello");

    console.log("[e2e] testing invalid API key...");

    await expect(provider.chat(request)).rejects.toThrow();

    try {
      await provider.chat(request);
    } catch (err) {
      console.log("[e2e] invalid key error:", err instanceof Error ? err.message : String(err));
    }
  });
});
