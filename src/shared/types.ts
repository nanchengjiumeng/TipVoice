export interface TTSSettings {
  apiKey: string;
  resourceId: string;
  voiceType: string;
  speechRate: number; // [-50, 100], 0 = normal
  loudnessRate: number; // [-50, 100], 0 = normal
}

export type PlaybackState = "idle" | "loading" | "playing" | "error";

export type ExtensionMessage =
  | TTSRequestMessage
  | TTSResponseMessage
  | TTSCancelMessage
  | AudioStreamStartMessage
  | AudioChunkMessage
  | AudioEndMessage
  | AudioStopMessage
  | AudioStateMessage
  | AudioPlayCachedMessage;

export interface TTSRequestMessage {
  type: "TTS_REQUEST";
  text: string;
}

export interface TTSResponseMessage {
  type: "TTS_RESPONSE";
  success: boolean;
  error?: string;
}

export interface TTSCancelMessage {
  type: "TTS_CANCEL";
}

export interface AudioStreamStartMessage {
  type: "AUDIO_STREAM_START";
}

export interface AudioChunkMessage {
  type: "AUDIO_CHUNK";
  chunk: string; // base64
}

export interface AudioEndMessage {
  type: "AUDIO_END";
}

export interface AudioStopMessage {
  type: "AUDIO_STOP";
}

export interface AudioStateMessage {
  type: "AUDIO_STATE";
  state: "playing" | "ended" | "error";
}

export interface AudioPlayCachedMessage {
  type: "AUDIO_PLAY_CACHED";
  audioBase64: string;
}

export interface AudioCacheEntry {
  cacheKey: string;
  text: string;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
  audioSize: number;
  createdAt: number;
}
