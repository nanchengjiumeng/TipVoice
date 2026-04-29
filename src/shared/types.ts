export type TTSProviderId = "volcengine" | "minimax";

export type MinimaxModel =
  | "speech-2.8-hd"
  | "speech-2.8-turbo"
  | "speech-2.6-hd"
  | "speech-2.6-turbo"
  | "speech-02-hd"
  | "speech-02-turbo"
  | "speech-01-hd"
  | "speech-01-turbo";

export type MinimaxAudioFormat = "mp3" | "pcm" | "flac" | "wav";

export interface VolcengineSettings {
  apiKey: string;
  resourceId: string;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
}

export interface MinimaxSettings {
  apiKey: string;
  model: MinimaxModel;
  voiceId: string;
  speed: number;
  vol: number;
  pitch: number;
  sampleRate: number;
  audioFormat: MinimaxAudioFormat;
}

export interface VoiceProfile {
  id: string;
  name: string;
  provider: TTSProviderId;
  volcengine: VolcengineSettings;
  minimax: MinimaxSettings;
}

export interface AppSettings {
  profiles: VoiceProfile[];
  activeProfileId: string;
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
  mimeType?: string;
}

export interface AudioChunkMessage {
  type: "AUDIO_CHUNK";
  chunk: string;
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
  mimeType?: string;
}

export interface MinimaxSystemVoice {
  voice_id: string;
  voice_name: string;
  description: string[];
}

export interface MinimaxVoiceListResult {
  system_voice: MinimaxSystemVoice[];
  voice_cloning: { voice_id: string; description: string[]; created_time: string }[];
  voice_generation: { voice_id: string; description: string[]; created_time: string }[];
}

export interface AudioCacheEntry {
  cacheKey: string;
  text: string;
  provider: TTSProviderId;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
  audioSize: number;
  createdAt: number;
}

// Legacy type kept for migration
export interface TTSSettings {
  provider: TTSProviderId;
  apiKey: string;
  resourceId: string;
  voiceType: string;
  speechRate: number;
  loudnessRate: number;
  volcengine: VolcengineSettings;
  minimax: MinimaxSettings;
}
