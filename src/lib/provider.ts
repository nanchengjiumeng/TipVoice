import type { TTSSettings } from "../shared/types.ts";

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

export interface TTSProvider {
  synthesizeStream(
    settings: TTSSettings,
    text: string,
    onAudioChunk: (data: Uint8Array) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}
