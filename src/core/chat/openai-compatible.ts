import type { ChatRequest, ChatResponse, ChatStreamChunk } from "./types.ts";
import { ChatApiError, ChatNetworkError } from "./errors.ts";

const STREAM_IDLE_TIMEOUT_MS = 30_000;

const log = (...args: unknown[]) => console.debug("[Tip Voice][chat]", ...args);

function getUserMessageLength(messages: ChatRequest["messages"]): number | undefined {
  const userMessage = messages.find((m) => m.role === "user");
  return userMessage?.content.length;
}

function buildBody(request: ChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    stream: false,
    messages: request.messages,
  };
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
  if (request.extra) Object.assign(body, request.extra);
  return body;
}

function buildStreamBody(request: ChatRequest): Record<string, unknown> {
  const body = buildBody(request);
  body.stream = true;
  return body;
}

export async function chatOpenAICompatible(
  url: string,
  apiKey: string,
  request: ChatRequest,
  providerName: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const body = buildBody(request);
  log("chat request start", {
    provider: providerName,
    model: body.model as string,
    textLength: getUserMessageLength(request.messages),
    hasApiKey: Boolean(apiKey),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ChatNetworkError(
      `Failed to reach ${providerName} server: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new ChatApiError(1004, "Authentication failed: invalid API key");
    }
    throw new ChatNetworkError(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new ChatApiError(500, "No result returned");
  }

  log("chat request complete", { provider: providerName, resultLength: content.length });
  return {
    content,
    model: json.model ?? request.model,
    usage: json.usage
      ? {
          promptTokens: json.usage.prompt_tokens ?? 0,
          completionTokens: json.usage.completion_tokens ?? 0,
        }
      : undefined,
  };
}

export async function chatOpenAICompatibleStream(
  url: string,
  apiKey: string,
  request: ChatRequest,
  providerName: string,
  onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const body = buildStreamBody(request);
  let response: Response;
  const timeoutController = new AbortController();
  const requestSignal = timeoutController.signal;
  let timeoutReason: "response" | "chunk" | null = null;
  const abortFromParent = () => timeoutController.abort();

  log("stream request start", {
    provider: providerName,
    model: body.model as string,
    textLength: getUserMessageLength(request.messages),
    hasApiKey: Boolean(apiKey),
  });

  if (signal?.aborted) timeoutController.abort();
  signal?.addEventListener("abort", abortFromParent, { once: true });

  let responseTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    timeoutReason = "response";
    log("stream response timeout", { provider: providerName, timeoutMs: STREAM_IDLE_TIMEOUT_MS });
    timeoutController.abort();
  }, STREAM_IDLE_TIMEOUT_MS);

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: requestSignal,
    });
  } catch (err) {
    log("stream request fetch failed", {
      provider: providerName,
      aborted: requestSignal.aborted,
      timeoutReason,
      error: err instanceof Error ? err.message : String(err),
    });
    if (timeoutReason === "response") {
      throw new ChatNetworkError(
        `${providerName} ${STREAM_IDLE_TIMEOUT_MS / 1000} 秒内没有返回响应头，已停止`,
      );
    }
    if (signal?.aborted) throw err;
    throw new ChatNetworkError(
      `Failed to reach ${providerName} server: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    if (responseTimeout) {
      clearTimeout(responseTimeout);
      responseTimeout = null;
    }
  }

  log("stream response received", {
    provider: providerName,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type"),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new ChatApiError(1004, "Authentication failed: invalid API key");
    }
    throw new ChatNetworkError(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new ChatNetworkError(`${providerName} response body is empty`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";
  const throwIfAborted = () => {
    if (requestSignal.aborted) {
      if (timeoutReason === "chunk") {
        throw new ChatNetworkError(
          `${providerName} ${STREAM_IDLE_TIMEOUT_MS / 1000} 秒内没有下一段流式响应，已停止`,
        );
      }
      throw new DOMException("Chat stream aborted", "AbortError");
    }
  };
  const cancelReader = () => {
    void reader.cancel().catch(() => {});
  };

  requestSignal.addEventListener("abort", cancelReader, { once: true });
  try {
    while (true) {
      throwIfAborted();
      let chunkTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        timeoutReason = "chunk";
        log("stream chunk timeout", {
          provider: providerName,
          timeoutMs: STREAM_IDLE_TIMEOUT_MS,
          resultLength: result.length,
        });
        timeoutController.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
      let readResult: ReadableStreamReadResult<Uint8Array>;
      try {
        readResult = await reader.read();
      } catch (err) {
        throwIfAborted();
        throw err;
      } finally {
        if (chunkTimeout) {
          clearTimeout(chunkTimeout);
          chunkTimeout = null;
        }
      }
      const { done, value } = readResult;
      throwIfAborted();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          if (!result) throw new ChatApiError(500, "No result returned");
          return result;
        }

        const event = parseStreamEvent(data);
        if (event.content) {
          result += event.content;
          log("stream content chunk", {
            provider: providerName,
            chunkLength: event.content.length,
            resultLength: result.length,
          });
          onChunk(event, result);
        }
        if (event.done) {
          if (!result) throw new ChatApiError(500, "No result returned");
          return result;
        }
      }
    }
  } finally {
    requestSignal.removeEventListener("abort", cancelReader);
    signal?.removeEventListener("abort", abortFromParent);
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const event = parseStreamEvent(trimmed.slice(5).trim());
      if (event.content) {
        result += event.content;
        log("stream trailing content chunk", {
          provider: providerName,
          chunkLength: event.content.length,
          resultLength: result.length,
        });
        onChunk(event, result);
      }
    }
  }

  if (!result) {
    throw new ChatApiError(500, "No result returned");
  }

  log("stream request complete", { provider: providerName, resultLength: result.length });
  return result;
}

function parseStreamEvent(data: string): ChatStreamChunk {
  try {
    const json = JSON.parse(data) as {
      choices?: Array<{
        delta?: { content?: string; reasoning_content?: string };
        finish_reason?: string | null;
        message?: { content?: string };
      }>;
    };
    const choice = json.choices?.[0];
    return {
      content: choice?.delta?.content ?? choice?.message?.content ?? "",
      done: choice?.finish_reason != null,
    };
  } catch {
    return { content: "", done: false };
  }
}
