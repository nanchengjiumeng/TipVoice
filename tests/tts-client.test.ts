import { describe, expect, it, vi, beforeEach } from "vite-plus/test";
import { resetChromeStorage } from "./setup.ts";
import { VolcengineProvider } from "../src/lib/volcengine-provider.ts";
import { TTSNetworkError } from "../src/lib/provider.ts";
import type { TTSSettings } from "../src/shared/types.ts";
import { DEFAULT_VOLCENGINE, DEFAULT_MINIMAX } from "../src/shared/constants.ts";

const mockSettings: TTSSettings = {
  provider: "volcengine",
  apiKey: "test-api-key",
  resourceId: DEFAULT_VOLCENGINE.resourceId,
  voiceType: DEFAULT_VOLCENGINE.voiceType,
  speechRate: DEFAULT_VOLCENGINE.speechRate,
  loudnessRate: DEFAULT_VOLCENGINE.loudnessRate,
  volcengine: { ...DEFAULT_VOLCENGINE, apiKey: "test-api-key" },
  minimax: { ...DEFAULT_MINIMAX },
};

const encoder = new TextEncoder();

function ndjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  const text = lines.join("\n") + "\n";
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

function mockFetchWith(stream: ReadableStream<Uint8Array>, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(stream, {
      status,
      statusText: status === 200 ? "OK" : "Error",
    }),
  );
}

describe("VolcengineProvider (JSON/NDJSON)", () => {
  const provider = new VolcengineProvider();

  beforeEach(() => {
    resetChromeStorage();
    vi.restoreAllMocks();
  });

  it("sends correct JSON request with auth headers", async () => {
    const stream = ndjsonStream([
      '{"code":0,"message":"","data":"AQID"}',
      '{"code":20000000,"message":"OK","data":null}',
    ]);
    const fetchMock = mockFetchWith(stream);
    vi.stubGlobal("fetch", fetchMock);

    const chunks: Uint8Array[] = [];
    await provider.synthesizeStream(mockSettings, "hello", (chunk) => chunks.push(chunk));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openspeech.bytedance.com/api/v3/tts/unidirectional");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "X-Api-Key": "test-api-key",
        "X-Api-Resource-Id": "seed-tts-2.0",
      }),
    );

    const body = JSON.parse(opts.body as string);
    expect(body.namespace).toBe("BidirectionalTTS");
    expect(body.req_params.text).toBe("hello");
    expect(body.req_params.speaker).toBe(mockSettings.volcengine.voiceType);
    expect(body.req_params.audio_params.format).toBe("mp3");
  });

  it("streams audio chunks from NDJSON data fields", async () => {
    const stream = ndjsonStream([
      `{"code":0,"message":"","data":"${btoa(String.fromCharCode(10, 20, 30))}"}`,
      `{"code":0,"message":"","data":"${btoa(String.fromCharCode(40, 50, 60))}"}`,
      '{"code":20000000,"message":"OK","data":null}',
    ]);
    vi.stubGlobal("fetch", mockFetchWith(stream));

    const chunks: Uint8Array[] = [];
    await provider.synthesizeStream(mockSettings, "hello world", (chunk) => chunks.push(chunk));

    expect(chunks).toHaveLength(2);
    expect(Array.from(chunks[0])).toEqual([10, 20, 30]);
    expect(Array.from(chunks[1])).toEqual([40, 50, 60]);
  });

  it("skips lines with null data (sentence metadata)", async () => {
    const stream = ndjsonStream([
      `{"code":0,"message":"","data":"${btoa(String.fromCharCode(1, 2, 3))}"}`,
      '{"code":0,"message":"","data":null,"sentence":{"text":"test"}}',
      '{"code":20000000,"message":"OK","data":null}',
    ]);
    vi.stubGlobal("fetch", mockFetchWith(stream));

    const chunks: Uint8Array[] = [];
    await provider.synthesizeStream(mockSettings, "test", (chunk) => chunks.push(chunk));

    expect(chunks).toHaveLength(1);
    expect(Array.from(chunks[0])).toEqual([1, 2, 3]);
  });

  it("throws TTSApiError on non-zero error code", async () => {
    const stream = ndjsonStream(['{"code":45000000,"message":"Invalid parameter","data":null}']);
    vi.stubGlobal("fetch", mockFetchWith(stream));

    await expect(provider.synthesizeStream(mockSettings, "test", () => {})).rejects.toThrow(
      expect.objectContaining({
        name: "TTSApiError",
        message: "Invalid parameter",
        code: 45000000,
      }),
    );
  });

  it("throws TTSNetworkError on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500, statusText: "Server Error" })),
    );

    await expect(provider.synthesizeStream(mockSettings, "test", () => {})).rejects.toThrow(
      TTSNetworkError,
    );
  });

  it("throws TTSNetworkError on fetch rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));

    await expect(provider.synthesizeStream(mockSettings, "test", () => {})).rejects.toThrow(
      TTSNetworkError,
    );
  });

  it("supports abort signal cancellation", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const controller = new AbortController();
    controller.abort();

    await expect(
      provider.synthesizeStream(mockSettings, "test", () => {}, controller.signal),
    ).rejects.toThrow();
  });

  it("handles NDJSON split across multiple stream chunks", async () => {
    const line1 = `{"code":0,"message":"","data":"${btoa(String.fromCharCode(1, 2, 3))}"}`;
    const line2 = '{"code":20000000,"message":"OK","data":null}';
    const fullText = line1 + "\n" + line2 + "\n";

    const splitPoint = Math.floor(line1.length / 2);
    const part1 = fullText.slice(0, splitPoint);
    const part2 = fullText.slice(splitPoint);

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

    vi.stubGlobal("fetch", mockFetchWith(stream));

    const chunks: Uint8Array[] = [];
    await provider.synthesizeStream(mockSettings, "test", (chunk) => chunks.push(chunk));

    expect(chunks).toHaveLength(1);
    expect(Array.from(chunks[0])).toEqual([1, 2, 3]);
  });
});
