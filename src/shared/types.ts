export type TTSProviderId = "volcengine" | "minimax";

export type TranslationProviderId = "minimax" | "siliconflow";

export type MinimaxModel =
  | "speech-2.8-hd"
  | "speech-2.8-turbo"
  | "speech-2.6-hd"
  | "speech-2.6-turbo"
  | "speech-02-hd"
  | "speech-02-turbo"
  | "speech-01-hd"
  | "speech-01-turbo";

export type MinimaxChatModel =
  | "MiniMax-M2.7"
  | "MiniMax-M2.7-highspeed"
  | "MiniMax-M2.5"
  | "MiniMax-M2.1";

export type SiliconflowChatModel =
  | "deepseek-ai/DeepSeek-V4-Flash"
  | "Pro/zai-org/GLM-5"
  | "Pro/zai-org/GLM-4.7"
  | "deepseek-ai/DeepSeek-V3.2"
  | "Pro/deepseek-ai/DeepSeek-V3.2"
  | "zai-org/GLM-4.6"
  | "Qwen/Qwen3-8B"
  | "Qwen/Qwen3-14B"
  | "Qwen/Qwen3-32B"
  | "Qwen/Qwen3-30B-A3B"
  | "tencent/Hunyuan-A13B-Instruct"
  | "zai-org/GLM-4.5V"
  | "deepseek-ai/DeepSeek-V3.1-Terminus"
  | "Pro/deepseek-ai/DeepSeek-V3.1-Terminus"
  | "Qwen/Qwen3.5-397B-A17B"
  | "Qwen/Qwen3.5-122B-A10B"
  | "Qwen/Qwen3.5-35B-A3B"
  | "Qwen/Qwen3.5-27B"
  | "Qwen/Qwen3.5-9B"
  | "Qwen/Qwen3.5-4B";

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

export interface MinimaxTranslationSettings {
  apiKey: string;
  model: MinimaxChatModel;
  prompt: string;
}

export interface SiliconflowTranslationSettings {
  apiKey: string;
  model: SiliconflowChatModel;
  prompt: string;
  enableThinking: boolean;
}

export interface VoiceProfile {
  id: string;
  name: string;
  provider: TTSProviderId;
  volcengine: VolcengineSettings;
  minimax: MinimaxSettings;
}

export interface TranslationProfile {
  id: string;
  name: string;
  provider: TranslationProviderId;
  minimax: MinimaxTranslationSettings;
  siliconflow: SiliconflowTranslationSettings;
}

export interface AppSettings {
  profiles: VoiceProfile[];
  activeProfileId: string;
}

export interface TranslationSettings {
  translationProfiles: TranslationProfile[];
  activeTranslationProfileIds: string[];
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
  | AudioPlayCachedMessage
  | AudioPlayUrlMessage
  | TranslationRequestMessage
  | TranslationResponseMessage
  | TranslationStreamStartMessage
  | TranslationStreamChunkMessage
  | TranslationStreamEndMessage
  | TranslationStreamErrorMessage
  | TranslationStreamDoneMessage;

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

export interface AudioPlayUrlMessage {
  type: "AUDIO_PLAY_URL";
  url: string;
}

export interface TranslationRequestMessage {
  type: "TRANSLATION_REQUEST";
  requestId: string;
  text: string;
}

export interface TranslationResponseMessage {
  type: "TRANSLATION_RESPONSE";
  success: boolean;
  result?: string;
  error?: string;
}

export interface TranslationStreamProfile {
  id: string;
  name: string;
}

export interface TranslationStreamStartMessage {
  type: "TRANSLATION_STREAM_START";
  requestId: string;
  profiles: TranslationStreamProfile[];
}

export interface TranslationStreamChunkMessage {
  type: "TRANSLATION_STREAM_CHUNK";
  requestId: string;
  profileId: string;
  profileName: string;
  chunk: string;
  result: string;
}

export interface TranslationStreamEndMessage {
  type: "TRANSLATION_STREAM_END";
  requestId: string;
  profileId: string;
  profileName: string;
  result: string;
}

export interface TranslationStreamErrorMessage {
  type: "TRANSLATION_STREAM_ERROR";
  requestId: string;
  profileId: string;
  profileName: string;
  error: string;
}

export interface TranslationStreamDoneMessage {
  type: "TRANSLATION_STREAM_DONE";
  requestId: string;
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

export interface TranslationCacheEntry {
  cacheKey: string;
  text: string;
  provider: TranslationProviderId;
  profileId: string;
  profileName: string;
  result: string;
  createdAt: number;
}

export type CacheEntry = AudioCacheEntry | TranslationCacheEntry;

export type CacheType = "audio" | "translation";

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
