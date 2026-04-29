import type { TTSSettings, MinimaxVoiceListResult } from "../shared/types.ts";
import { TTSApiError, TTSNetworkError } from "./provider.ts";
import { MINIMAX_HTTP_URL, MINIMAX_GET_VOICE_URL } from "../shared/constants.ts";

const MINIMAX_MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  pcm: "audio/pcm",
  flac: "audio/flac",
  wav: "audio/wav",
};

function getMinimaxMimeType(format: string): string {
  return MINIMAX_MIME_MAP[format] ?? "audio/mpeg";
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

interface MinimaxStreamLine {
  data?: { audio?: string; status?: number } | null;
  extra_info?: {
    audio_length?: number;
    audio_sample_rate?: number;
    audio_size?: number;
    bitrate?: number;
    audio_format?: string;
    audio_channel?: number;
    usage_characters?: number;
    word_count?: number;
  };
  trace_id?: string;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export class MinimaxProvider {
  async synthesizeStream(
    settings: TTSSettings,
    text: string,
    onAudioChunk: (data: Uint8Array) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const { minimax } = settings;
    const audioFormat = minimax.audioFormat === "wav" ? "mp3" : minimax.audioFormat;

    const body = {
      model: minimax.model,
      text,
      stream: true,
      stream_options: {
        exclude_aggregated_audio: true,
      },
      voice_setting: {
        voice_id: minimax.voiceId,
        speed: minimax.speed,
        vol: minimax.vol,
        pitch: minimax.pitch,
      },
      audio_setting: {
        sample_rate: minimax.sampleRate,
        format: audioFormat,
        channel: 1,
      },
    };

    let response: Response;
    try {
      response = await fetch(MINIMAX_HTTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${minimax.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new TTSNetworkError(
        `Failed to reach MiniMax server: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new TTSApiError(1004, "Authentication failed: invalid API key");
      }
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

        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("data:")) {
            const jsonStr = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
            if (!jsonStr) continue;

            let json: MinimaxStreamLine;
            try {
              json = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            const statusCode = json.base_resp?.status_code;
            if (statusCode !== undefined && statusCode !== 0) {
              throw new TTSApiError(statusCode, json.base_resp?.status_msg ?? "MiniMax API error");
            }

            if (json.data?.audio) {
              const audioHex = json.data.audio;
              if (audioHex) {
                onAudioChunk(hexToBytes(audioHex));
              }
            }
          }
        }
      }

      // Process any remaining buffer
      const remaining = buffer.trim();
      if (remaining) {
        const jsonStr = remaining.startsWith("data:") ? remaining.slice(5).trim() : remaining;
        if (jsonStr) {
          try {
            const json = JSON.parse(jsonStr) as MinimaxStreamLine;
            const statusCode = json.base_resp?.status_code;
            if (statusCode !== undefined && statusCode !== 0) {
              throw new TTSApiError(statusCode, json.base_resp?.status_msg ?? "MiniMax API error");
            }
            if (json.data?.audio) {
              onAudioChunk(hexToBytes(json.data.audio));
            }
          } catch (e) {
            if (e instanceof TTSApiError) throw e;
            // Ignore parse errors for remaining data
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export { getMinimaxMimeType };

export async function fetchMinimaxVoices(apiKey: string): Promise<MinimaxVoiceListResult> {
  let response: Response;
  try {
    response = await fetch(MINIMAX_GET_VOICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ voice_type: "all" }),
    });
  } catch (err) {
    throw new TTSNetworkError(
      `Failed to reach MiniMax voice API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new TTSApiError(1004, "Authentication failed: invalid API key");
    }
    throw new TTSNetworkError(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as MinimaxVoiceListResult & {
    base_resp?: { status_code?: number; status_msg?: string };
  };

  if (json.base_resp?.status_code && json.base_resp.status_code !== 0) {
    throw new TTSApiError(
      json.base_resp.status_code,
      json.base_resp.status_msg ?? "MiniMax voice API error",
    );
  }

  return json;
}
