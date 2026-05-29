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

export const DEFAULT_PROMPT = `# 角色与任务
你是一个专业的中英文翻译与词典助手。

# 处理逻辑
1. 输入为句子：直接给出流畅、自然的中文翻译。
2. 输入为单词：严格按照下方的模板输出该单词的词典释义。

# 单词输出规则
1. 单词原形：发音和链接必须使用去复数、去变形后的单词原形。
2. 音频链接：使用有道语音接口：
   - 英音 (UK): https://dict.youdao.com/dictvoice?type=1&audio=[单词原形]
   - 美音 (US): https://dict.youdao.com/dictvoice?type=2&audio=[单词原形]
3. 格式要求：严格遵循表格格式，使用 HTML audio 标签。

---

# [单词原形] / [复数/变形]
[简短核心中文释义]

| 发音 | 音标与音频 |
|---|---|
| 英式发音 | [英式音标] <audio src="https://dict.youdao.com/dictvoice?type=1&audio=[单词原形]" controls></audio> |
| 美式发音 | [美式音标] <audio src="https://dict.youdao.com/dictvoice?type=2&audio=[单词原形]" controls></audio> |

| 词性 | 释义(含英文) | 示例 |
|---|---|---|
| [词性1] | [英文解释] [中文释义] | [英文例句] [中文对照] |
| [词性2] | [英文解释] [中文释义] | [英文例句] [中文对照] |`;

export const DEFAULT_MINIMAX_TRANSLATION: MinimaxTranslationSettings = {
  apiKey: "",
  model: "MiniMax-M2.7-highspeed",
  prompt: DEFAULT_PROMPT,
};

export const DEFAULT_SILICONFLOW_TRANSLATION: SiliconflowTranslationSettings = {
  apiKey: "",
  model: "deepseek-ai/DeepSeek-V4-Flash",
  prompt: DEFAULT_PROMPT,
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

export const DEFAULT_SILICONFLOW_MODEL = "deepseek-ai/DeepSeek-V4-Flash";

export const AUDIO_MIME_TYPE = "audio/mpeg";

export const AUDIO_BLOB_DB_NAME = "tts_audio_blobs";
export const AUDIO_BLOB_STORE_NAME = "blobs";
export const AUDIO_CACHE_MAX_BYTES = 1024 * 1024 * 1024;
