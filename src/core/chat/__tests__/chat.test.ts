import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getChatProvider, listChatProviders, registerChatProvider } from "../factory.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";
import { ChatApiError, ChatNetworkError } from "../errors.ts";
import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatStreamChunk } from "../types.ts";

const encoder = new TextEncoder();

function makeSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const text = events.join("\n\n") + "\n\n";
  let sent = false;
  return new ReadableStream({
    pull(controller) {
      if (!sent) {
        controller.enqueue(encoder.encode(text));
        sent = true;
      } else {
        controller.close();
      }
    },
  });
}

function mockFetchWith(body: string | ReadableStream, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(body, { status, statusText: status === 200 ? "OK" : "Error" }));
}

const sampleRequest: ChatRequest = {
  model: "test-model",
  messages: [
    { role: "system", content: "You are a helper." },
    { role: "user", content: "Hello" },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("chatOpenAICompatible (non-stream)", () => {
  it("returns parsed ChatResponse", async () => {
    mockFetchWith(
      JSON.stringify({
        model: "test-model",
        choices: [{ message: { content: "Hi there!" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );

    const result = await chatOpenAICompatible(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      sampleRequest,
      "TestProvider",
    );

    expect(result.content).toBe("Hi there!");
    expect(result.model).toBe("test-model");
    expect(result.usage?.promptTokens).toBe(10);
    expect(result.usage?.completionTokens).toBe(5);
  });

  it("sends correct headers and body", async () => {
    const fetchMock = mockFetchWith(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));

    await chatOpenAICompatible(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      sampleRequest,
      "TestProvider",
    );

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test.com/v1/chat/completions");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        Authorization: "Bearer sk-test",
      }),
    );
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
  });

  it("includes extra fields in request body", async () => {
    const fetchMock = mockFetchWith(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    const request: ChatRequest = {
      ...sampleRequest,
      extra: { enable_thinking: true },
    };

    await chatOpenAICompatible(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      request,
      "TestProvider",
    );

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(body.enable_thinking).toBe(true);
  });

  it("throws ChatApiError(1004) on 401", async () => {
    mockFetchWith("unauthorized", 401);

    await expect(
      chatOpenAICompatible(
        "https://api.test.com/v1/chat/completions",
        "bad-key",
        sampleRequest,
        "TestProvider",
      ),
    ).rejects.toThrowError(ChatApiError);
  });

  it("throws ChatNetworkError on HTTP 500", async () => {
    mockFetchWith("error", 500);

    await expect(
      chatOpenAICompatible(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
      ),
    ).rejects.toThrowError(ChatNetworkError);
  });

  it("throws ChatNetworkError on fetch rejection", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));

    await expect(
      chatOpenAICompatible(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
      ),
    ).rejects.toThrowError(ChatNetworkError);
  });

  it("throws ChatApiError when no content returned", async () => {
    mockFetchWith(JSON.stringify({ choices: [{ message: {} }] }));

    await expect(
      chatOpenAICompatible(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
      ),
    ).rejects.toThrowError(ChatApiError);
  });
});

describe("chatOpenAICompatibleStream", () => {
  it("correctly parses SSE stream events", async () => {
    mockFetchWith(
      makeSSEStream([
        'data: {"choices":[{"delta":{"content":"hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        "data: [DONE]",
      ]),
    );

    const chunks: string[] = [];
    const result = await chatOpenAICompatibleStream(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      sampleRequest,
      "TestProvider",
      (chunk: ChatStreamChunk, _accumulated: string) => {
        chunks.push(chunk.content);
      },
    );

    expect(result).toBe("hello");
    expect(chunks).toEqual(["hel", "lo"]);
  });

  it("finishes when finish_reason is returned without [DONE]", async () => {
    mockFetchWith(
      makeSSEStream([
        'data: {"choices":[{"delta":{"content":"done"},"finish_reason":null}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      ]),
    );

    const result = await chatOpenAICompatibleStream(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      sampleRequest,
      "TestProvider",
      () => {},
    );

    expect(result).toBe("done");
  });

  it("throws ChatApiError when stream returns no content", async () => {
    mockFetchWith(makeSSEStream(["data: [DONE]"]));

    await expect(
      chatOpenAICompatibleStream(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
        () => {},
      ),
    ).rejects.toThrowError(ChatApiError);
  });

  it("throws ChatApiError(1004) on 401", async () => {
    mockFetchWith("unauthorized", 401);

    await expect(
      chatOpenAICompatibleStream(
        "https://api.test.com/v1/chat/completions",
        "bad-key",
        sampleRequest,
        "TestProvider",
        () => {},
      ),
    ).rejects.toThrowError(ChatApiError);
  });

  it("throws ChatNetworkError on fetch rejection", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));

    await expect(
      chatOpenAICompatibleStream(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
        () => {},
      ),
    ).rejects.toThrowError(ChatNetworkError);
  });

  it("respects abort signal", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const controller = new AbortController();
    controller.abort();

    await expect(
      chatOpenAICompatibleStream(
        "https://api.test.com/v1/chat/completions",
        "sk-test",
        sampleRequest,
        "TestProvider",
        () => {},
        controller.signal,
      ),
    ).rejects.toThrow();
  });

  it("handles SSE split across multiple stream chunks", async () => {
    const part1 = 'data: {"choices":[{"delta":{';
    const part2 =
      '"content":"hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n';

    let index = 0;
    const parts = [part1, part2];
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < parts.length) {
          controller.enqueue(encoder.encode(parts[index]));
          index++;
        } else {
          controller.close();
        }
      },
    });
    mockFetchWith(stream);

    const chunks: string[] = [];
    const result = await chatOpenAICompatibleStream(
      "https://api.test.com/v1/chat/completions",
      "sk-test",
      sampleRequest,
      "TestProvider",
      (chunk: ChatStreamChunk) => chunks.push(chunk.content),
    );

    expect(result).toBe("hello");
    expect(chunks).toEqual(["hel", "lo"]);
  });
});

describe("factory: getChatProvider", () => {
  it("returns correct provider for known ids", () => {
    const minimax = getChatProvider("minimax", { apiKey: "sk-test" });
    const siliconflow = getChatProvider("siliconflow", { apiKey: "sk-test" });
    const openai = getChatProvider("openai", { apiKey: "sk-test" });

    expect(minimax.id).toBe("minimax");
    expect(siliconflow.id).toBe("siliconflow");
    expect(openai.id).toBe("openai");
  });

  it("throws for unknown provider id", () => {
    expect(() => getChatProvider("unknown" as never, { apiKey: "sk-test" })).toThrow(
      /Unknown chat provider/,
    );
  });

  it("listChatProviders returns all registered ids", () => {
    const providers = listChatProviders();
    expect(providers).toContain("minimax");
    expect(providers).toContain("siliconflow");
    expect(providers).toContain("openai");
  });

  it("registerChatProvider allows custom providers", () => {
    class CustomProvider implements ChatProvider {
      readonly id = "custom";
      async chat() {
        return { content: "custom", model: "custom" };
      }
      async chatStream(
        _request: ChatRequest,
        onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
      ) {
        onChunk({ content: "custom", done: true }, "custom");
        return "custom";
      }
    }
    registerChatProvider("custom" as never, (_config: ChatProviderConfig) => new CustomProvider());

    const provider = getChatProvider("custom" as never, { apiKey: "sk-test" });
    expect(provider.id).toBe("custom");
  });
});
