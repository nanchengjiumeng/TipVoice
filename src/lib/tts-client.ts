import type { TTSSettings } from "../shared/types.ts";
import { TTS_API_URL } from "../shared/constants.ts";

export class TTSApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}

export class TTSNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TTSNetworkError";
  }
}

// V3 API completion code
const CODE_OK = 20000000;

interface V3ResponseLine {
  code: number;
  message: string;
  data: string | null;
  sentence?: { text: string };
}

function buildAuthHeaders(settings: TTSSettings): Record<string, string> {
  return {
    "X-Api-Key": settings.apiKey,
    "X-Api-Resource-Id": settings.resourceId,
    "X-Api-Connect-Id": crypto.randomUUID(),
  };
}

function buildRequestPayload(settings: TTSSettings, text: string): object {
  return {
    namespace: "BidirectionalTTS",
    req_params: {
      text,
      speaker: settings.voiceType,
      audio_params: {
        format: "mp3",
        sample_rate: 24000,
        speech_rate: settings.speechRate,
        loudness_rate: settings.loudnessRate,
      },
    },
  };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function synthesizeStream(
  settings: TTSSettings,
  text: string,
  onAudioChunk: (data: Uint8Array) => void,
  signal?: AbortSignal,
): Promise<void> {
  const payload = buildRequestPayload(settings, text);
  const headers = buildAuthHeaders(settings);

  let response: Response;
  try {
    response = await fetch(TTS_API_URL, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new TTSNetworkError(
      `Failed to reach TTS server: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new TTSNetworkError(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new TTSNetworkError("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete NDJSON lines
      const lines = buffer.split("\n");
      buffer = lines.pop()!; // Keep incomplete last line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const json = JSON.parse(trimmed) as V3ResponseLine;

        if (json.code === CODE_OK) {
          return; // Stream complete
        }

        if (json.code !== 0) {
          throw new TTSApiError(json.code, json.message || "Unknown API error");
        }

        if (json.data) {
          onAudioChunk(base64ToBytes(json.data));
        }
      }
    }

    // Process any remaining data in buffer
    const remaining = buffer.trim();
    if (remaining) {
      const json = JSON.parse(remaining) as V3ResponseLine;
      if (json.code !== 0 && json.code !== CODE_OK) {
        throw new TTSApiError(json.code, json.message || "Unknown API error");
      }
      if (json.data) {
        onAudioChunk(base64ToBytes(json.data));
      }
    }
  } finally {
    reader.releaseLock();
  }
}
