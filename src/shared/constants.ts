import type {
  VoiceProfile,
  VolcengineSettings,
  MinimaxSettings,
  TTSProviderId,
  TranslationProfile,
  MinimaxTranslationSettings,
  SiliconflowTranslationSettings,
  TranslationProviderId,
} from "./types.ts";

export const TTS_API_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

export const MINIMAX_HTTP_URL = "https://api.minimaxi.com/v1/t2a_v2";

export const MINIMAX_GET_VOICE_URL = "https://api.minimaxi.com/v1/get_voice";

export const MINIMAX_CHAT_URL = "https://api.minimaxi.com/v1/chat/completions";

export const SILICONFLOW_CHAT_URL = "https://api.siliconflow.cn/v1/chat/completions";

export const SETTINGS_STORAGE_KEY = "tts_settings";
export const PROFILES_STORAGE_KEY = "tts_profiles";
export const TRANSLATION_PROFILES_STORAGE_KEY = "translation_profiles";
export const TRANSLATION_SETTINGS_STORAGE_KEY = "translation_settings";

export const DEFAULT_VOLCENGINE: VolcengineSettings = {
  apiKey: "",
  resourceId: "seed-tts-2.0",
  voiceType: "zh_male_wennuanahu_uranus_bigtts",
  speechRate: 0,
  loudnessRate: 0,
};

export const DEFAULT_MINIMAX: MinimaxSettings = {
  apiKey: "",
  model: "speech-2.8-turbo",
  voiceId: "Chinese (Mandarin)_Lyrical_Voice",
  speed: 1.0,
  vol: 1.0,
  pitch: 0,
  sampleRate: 32000,
  audioFormat: "mp3",
};

export const DEFAULT_MINIMAX_TRANSLATION: MinimaxTranslationSettings = {
  apiKey: "",
  model: "MiniMax-M2.7-highspeed",
  prompt: `按以下Markdown模板输出单词[单词]的词典释义，严格遵循表格格式，覆盖单复数与不同词性：

# [单词原形] / [复数/变形]

[简短核心中文释义]

| 发音 | 音标 |
|---|---|
| 英式音标 | [英式音标] |
| 美式音标 | [美式音标] |

| 词性 | 释义(含英文) | 示例 |
|---|---|---|
| [词性1] | [英文版释义1+中文释义1] | [示例1] |
| [词性2] | [英文版释义2+中文释义2] | [示例2] |`,
};

export const DEFAULT_SILICONFLOW_TRANSLATION: SiliconflowTranslationSettings = {
  apiKey: "",
  model: "deepseek-ai/DeepSeek-V4-Flash",
  prompt: `按以下Markdown模板输出单词[单词]的词典释义，严格遵循表格格式，覆盖单复数与不同词性：

# [单词原形] / [复数/变形]

[简短核心中文释义]

| 发音 | 音标 |
|---|---|
| 英式音标 | [英式音标] |
| 美式音标 | [美式音标] |

| 词性 | 释义(含英文) | 示例 |
|---|---|---|
| [词性1] | [英文版释义1+中文释义1] | [示例1] |
| [词性2] | [英文版释义2+中文释义2] | [示例2] |`,
  enableThinking: false,
};

export const DEFAULT_PROFILES: VoiceProfile[] = [
  {
    id: "default-volcengine",
    name: "火山引擎 默认",
    provider: "volcengine",
    volcengine: { ...DEFAULT_VOLCENGINE },
    minimax: { ...DEFAULT_MINIMAX },
  },
  {
    id: "default-minimax",
    name: "MiniMax 默认",
    provider: "minimax",
    volcengine: { ...DEFAULT_VOLCENGINE },
    minimax: { ...DEFAULT_MINIMAX },
  },
];

export const DEFAULT_TRANSLATION_PROFILES: TranslationProfile[] = [
  {
    id: "default-minimax-translation",
    name: "MiniMax 翻译",
    provider: "minimax",
    minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
    siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
  },
  {
    id: "default-siliconflow-translation",
    name: "硅基流动 翻译",
    provider: "siliconflow",
    minimax: { ...DEFAULT_MINIMAX_TRANSLATION },
    siliconflow: { ...DEFAULT_SILICONFLOW_TRANSLATION },
  },
];

export const VOLCENGINE_VOICE_PRESETS = [
  { label: "Vivi 2.0", value: "zh_female_vv_uranus_bigtts" },
  { label: "小何 2.0", value: "zh_female_xiaohe_uranus_bigtts" },
  { label: "云舟 2.0", value: "zh_male_m191_uranus_bigtts" },
  { label: "小天 2.0", value: "zh_male_taocheng_uranus_bigtts" },
  { label: "刘飞 2.0", value: "zh_male_liufei_uranus_bigtts" },
  { label: "魅力苏菲 2.0", value: "zh_female_sophie_uranus_bigtts" },
  { label: "清新女声 2.0", value: "zh_female_qingxinnvsheng_uranus_bigtts" },
  { label: "知性灿灿 2.0", value: "zh_female_cancan_uranus_bigtts" },
  { label: "撒娇学妹 2.0", value: "zh_female_sajiaoxuemei_uranus_bigtts" },
  { label: "甜美小源 2.0", value: "zh_female_tianmeixiaoyuan_uranus_bigtts" },
  { label: "温暖阿虎/Alvin 2.0", value: "zh_male_wennuanahu_uranus_bigtts" },
  { label: "温柔妈妈 2.0", value: "zh_female_wenroumama_uranus_bigtts" },
  { label: "知性女声 2.0", value: "zh_female_zhixingnv_uranus_bigtts" },
  { label: "高冷沉稳 2.0", value: "zh_male_gaolengchenwen_uranus_bigtts" },
  { label: "深夜播客 2.0", value: "zh_male_shenyeboke_uranus_bigtts" },
  { label: "Tim", value: "en_male_tim_uranus_bigtts" },
  { label: "Dacey", value: "en_female_dacey_uranus_bigtts" },
] as const;

export const MINIMAX_VOICE_PRESETS = [
  { label: "Lyrical Voice (中文)", value: "Chinese (Mandarin)_Lyrical_Voice" },
  { label: "HK Flight Attendant (粤语)", value: "Chinese (Mandarin)_HK_Flight_Attendant" },
  { label: "Graceful Lady (英文)", value: "English_Graceful_Lady" },
  { label: "Insightful Speaker (英文)", value: "English_Insightful_Speaker" },
  { label: "Radiant Girl (英文)", value: "English_radiant_girl" },
  { label: "Persuasive Man (英文)", value: "English_Persuasive_Man" },
  { label: "Lucky Robot (英文)", value: "English_Lucky_Robot" },
  { label: "Whisper Belle (日文)", value: "Japanese_Whisper_Belle" },
] as const;

export const MINIMAX_MODELS = [
  { label: "Speech 2.8 HD", value: "speech-2.8-hd" as const },
  { label: "Speech 2.8 Turbo", value: "speech-2.8-turbo" as const },
  { label: "Speech 2.6 HD", value: "speech-2.6-hd" as const },
  { label: "Speech 2.6 Turbo", value: "speech-2.6-turbo" as const },
  { label: "Speech 02 HD", value: "speech-02-hd" as const },
  { label: "Speech 02 Turbo", value: "speech-02-turbo" as const },
  { label: "Speech 01 HD", value: "speech-01-hd" as const },
  { label: "Speech 01 Turbo", value: "speech-01-turbo" as const },
] as const;

export const MINIMAX_AUDIO_FORMATS = [
  { label: "MP3", value: "mp3" as const },
  { label: "PCM", value: "pcm" as const },
  { label: "FLAC", value: "flac" as const },
] as const;

export const MINIMAX_SAMPLE_RATES = [8000, 16000, 22050, 24000, 32000, 44100] as const;

export const PROVIDER_LABELS: Record<TTSProviderId, string> = {
  volcengine: "火山引擎",
  minimax: "MiniMax",
};

export const TRANSLATION_PROVIDER_LABELS: Record<TranslationProviderId, string> = {
  minimax: "MiniMax",
  siliconflow: "硅基流动",
};

export const MINIMAX_CHAT_MODELS = [
  { label: "MiniMax-M2.7 (推荐)", value: "MiniMax-M2.7" as const },
  { label: "MiniMax-M2.7-highspeed", value: "MiniMax-M2.7-highspeed" as const },
  { label: "MiniMax-M2.5", value: "MiniMax-M2.5" as const },
  { label: "MiniMax-M2.1", value: "MiniMax-M2.1" as const },
] as const;

export const SILICONFLOW_CHAT_MODELS = [
  { label: "DeepSeek-V4-Flash (推荐)", value: "deepseek-ai/DeepSeek-V4-Flash" as const },
  { label: "GLM-5 Pro", value: "Pro/zai-org/GLM-5" as const },
  { label: "GLM-4.7 Pro", value: "Pro/zai-org/GLM-4.7" as const },
  { label: "DeepSeek-V3.2", value: "deepseek-ai/DeepSeek-V3.2" as const },
  { label: "DeepSeek-V3.2 Pro", value: "Pro/deepseek-ai/DeepSeek-V3.2" as const },
  { label: "GLM-4.6", value: "zai-org/GLM-4.6" as const },
  { label: "Qwen3-8B", value: "Qwen/Qwen3-8B" as const },
  { label: "Qwen3-14B", value: "Qwen/Qwen3-14B" as const },
  { label: "Qwen3-32B (推荐)", value: "Qwen/Qwen3-32B" as const },
  { label: "Qwen3-30B-A3B", value: "Qwen/Qwen3-30B-A3B" as const },
  { label: "Hunyuan-A13B-Instruct", value: "tencent/Hunyuan-A13B-Instruct" as const },
  { label: "GLM-4.5V", value: "zai-org/GLM-4.5V" as const },
  { label: "DeepSeek-V3.1-Terminus", value: "deepseek-ai/DeepSeek-V3.1-Terminus" as const },
  {
    label: "DeepSeek-V3.1-Terminus Pro",
    value: "Pro/deepseek-ai/DeepSeek-V3.1-Terminus" as const,
  },
  { label: "Qwen3.5-397B-A17B", value: "Qwen/Qwen3.5-397B-A17B" as const },
  { label: "Qwen3.5-122B-A10B", value: "Qwen/Qwen3.5-122B-A10B" as const },
  { label: "Qwen3.5-35B-A3B", value: "Qwen/Qwen3.5-35B-A3B" as const },
  { label: "Qwen3.5-27B", value: "Qwen/Qwen3.5-27B" as const },
  { label: "Qwen3.5-9B", value: "Qwen/Qwen3.5-9B" as const },
  { label: "Qwen3.5-4B", value: "Qwen/Qwen3.5-4B" as const },
] as const;

export const AUDIO_MIME_TYPE = "audio/mpeg";

export const AUDIO_BLOB_DB_NAME = "tts_audio_blobs";
export const AUDIO_BLOB_STORE_NAME = "blobs";
export const AUDIO_CACHE_MAX_BYTES = 1024 * 1024 * 1024;
