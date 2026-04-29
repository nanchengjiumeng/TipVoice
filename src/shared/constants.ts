import type { TTSSettings } from "./types.ts";
import type { TTSProviderId } from "./types.ts";

export const TTS_API_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

export const MINIMAX_HTTP_URL = "https://api.minimaxi.com/v1/t2a_v2";

export const MINIMAX_GET_VOICE_URL = "https://api.minimaxi.com/v1/get_voice";

export const STORAGE_KEY = "tts_settings";

export const DEFAULT_SETTINGS: TTSSettings = {
  provider: "volcengine",
  apiKey: "",
  resourceId: "seed-tts-2.0",
  voiceType: "zh_male_wennuanahu_uranus_bigtts",
  speechRate: 0,
  loudnessRate: 0,
  volcengine: {
    apiKey: "",
    resourceId: "seed-tts-2.0",
    voiceType: "zh_male_wennuanahu_uranus_bigtts",
    speechRate: 0,
    loudnessRate: 0,
  },
  minimax: {
    apiKey: "",
    model: "speech-2.8-turbo",
    voiceId: "Chinese (Mandarin)_Lyrical_Voice",
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
    sampleRate: 32000,
    audioFormat: "mp3",
  },
};

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
  { label: "甜美桃子 2.0", value: "zh_female_tianmeitaozi_uranus_bigtts" },
  { label: "爽快思思 2.0", value: "zh_female_shuangkuaisisi_uranus_bigtts" },
  { label: "佩奇猪 2.0", value: "zh_female_peiqi_uranus_bigtts" },
  { label: "邻家女孩 2.0", value: "zh_female_linjianvhai_uranus_bigtts" },
  { label: "少年梓辛/Brayan 2.0", value: "zh_male_shaonianzixin_uranus_bigtts" },
  { label: "猴哥 2.0", value: "zh_male_sunwukong_uranus_bigtts" },
  { label: "Tina老师 2.0", value: "zh_female_yingyujiaoxue_uranus_bigtts" },
  { label: "暖阳女声 2.0", value: "zh_female_kefunvsheng_uranus_bigtts" },
  { label: "儿童绘本 2.0", value: "zh_female_xiaoxue_uranus_bigtts" },
  { label: "大壹 2.0", value: "zh_male_dayi_uranus_bigtts" },
  { label: "黑猫侦探社咪仔 2.0", value: "zh_female_mizai_uranus_bigtts" },
  { label: "鸡汤女 2.0", value: "zh_female_jitangnv_uranus_bigtts" },
  { label: "魅力女友 2.0", value: "zh_female_meilinvyou_uranus_bigtts" },
  { label: "流畅女声 2.0", value: "zh_female_liuchangnvsheng_uranus_bigtts" },
  { label: "儒雅逸辰 2.0", value: "zh_male_ruyayichen_uranus_bigtts" },
  { label: "Tim", value: "en_male_tim_uranus_bigtts" },
  { label: "Dacey", value: "en_female_dacey_uranus_bigtts" },
  { label: "Stokie", value: "en_female_stokie_uranus_bigtts" },
  { label: "温柔妈妈 2.0", value: "zh_female_wenroumama_uranus_bigtts" },
  { label: "解说小明 2.0", value: "zh_male_jieshuoxiaoming_uranus_bigtts" },
  { label: "TVB女声 2.0", value: "zh_female_tvbnv_uranus_bigtts" },
  { label: "译制片男 2.0", value: "zh_male_yizhipiannan_uranus_bigtts" },
  { label: "俏皮女声 2.0", value: "zh_female_qiaopinv_uranus_bigtts" },
  { label: "直率英子 2.0", value: "zh_female_zhishuaiyingzi_uranus_bigtts" },
  { label: "邻家男孩 2.0", value: "zh_male_linjiananhai_uranus_bigtts" },
  { label: "四郎 2.0", value: "zh_male_silang_uranus_bigtts" },
  { label: "儒雅青年 2.0", value: "zh_male_ruyaqingnian_uranus_bigtts" },
  { label: "擎苍 2.0", value: "zh_male_qingcang_uranus_bigtts" },
  { label: "熊二 2.0", value: "zh_male_xionger_uranus_bigtts" },
  { label: "樱桃丸子 2.0", value: "zh_female_yingtaowanzi_uranus_bigtts" },
  { label: "温暖阿虎/Alvin 2.0", value: "zh_male_wennuanahu_uranus_bigtts" },
  { label: "奶气萌娃 2.0", value: "zh_male_naiqimengwa_uranus_bigtts" },
  { label: "婆婆 2.0", value: "zh_female_popo_uranus_bigtts" },
  { label: "高冷御姐 2.0", value: "zh_female_gaolengyujie_uranus_bigtts" },
  { label: "傲娇霸总 2.0", value: "zh_male_aojiaobazong_uranus_bigtts" },
  { label: "懒音绵宝 2.0", value: "zh_male_lanyinmianbao_uranus_bigtts" },
  { label: "反卷青年 2.0", value: "zh_male_fanjuanqingnian_uranus_bigtts" },
  { label: "温柔淑女 2.0", value: "zh_female_wenroushunv_uranus_bigtts" },
  { label: "古风少御 2.0", value: "zh_female_gufengshaoyu_uranus_bigtts" },
  { label: "活力小哥 2.0", value: "zh_male_huolixiaoge_uranus_bigtts" },
  { label: "霸气青叔 2.0", value: "zh_male_baqiqingshu_uranus_bigtts" },
  { label: "悬疑解说 2.0", value: "zh_male_xuanyijieshuo_uranus_bigtts" },
  { label: "萌丫头/Cutey 2.0", value: "zh_female_mengyatou_uranus_bigtts" },
  { label: "贴心女声/Candy 2.0", value: "zh_female_tiexinnvsheng_uranus_bigtts" },
  { label: "鸡汤妹妹/Hope 2.0", value: "zh_female_jitangmei_uranus_bigtts" },
  { label: "磁性解说男声/Morgan 2.0", value: "zh_male_cixingjieshuonan_uranus_bigtts" },
  { label: "亮嗓萌仔 2.0", value: "zh_male_liangsangmengzai_uranus_bigtts" },
  { label: "开朗姐姐 2.0", value: "zh_female_kailangjiejie_uranus_bigtts" },
  { label: "高冷沉稳 2.0", value: "zh_male_gaolengchenwen_uranus_bigtts" },
  { label: "深夜播客 2.0", value: "zh_male_shenyeboke_uranus_bigtts" },
  { label: "鲁班七号 2.0", value: "zh_male_lubanqihao_uranus_bigtts" },
  { label: "娇喘女声 2.0", value: "zh_female_jiaochuannv_uranus_bigtts" },
  { label: "林潇 2.0", value: "zh_female_linxiao_uranus_bigtts" },
  { label: "玲玲姐姐 2.0", value: "zh_female_lingling_uranus_bigtts" },
  { label: "春日部姐姐 2.0", value: "zh_female_chunribu_uranus_bigtts" },
  { label: "唐僧 2.0", value: "zh_male_tangseng_uranus_bigtts" },
  { label: "庄周 2.0", value: "zh_male_zhuangzhou_uranus_bigtts" },
  { label: "开朗弟弟 2.0", value: "zh_male_kailangdidi_uranus_bigtts" },
  { label: "猪八戒 2.0", value: "zh_male_zhubajie_uranus_bigtts" },
  { label: "感冒电音姐姐 2.0", value: "zh_female_ganmaodianyin_uranus_bigtts" },
  { label: "谄媚女声 2.0", value: "zh_female_chanmeinv_uranus_bigtts" },
  { label: "女雷神 2.0", value: "zh_female_nvleishen_uranus_bigtts" },
  { label: "亲切女声 2.0", value: "zh_female_qinqienv_uranus_bigtts" },
  { label: "快乐小东 2.0", value: "zh_male_kuailexiaodong_uranus_bigtts" },
  { label: "开朗学长 2.0", value: "zh_male_kailangxuezhang_uranus_bigtts" },
  { label: "悠悠君子 2.0", value: "zh_male_youyoujunzi_uranus_bigtts" },
  { label: "文静毛毛 2.0", value: "zh_female_wenjingmaomao_uranus_bigtts" },
  { label: "知性女声 2.0", value: "zh_female_zhixingnv_uranus_bigtts" },
  { label: "清爽男大 2.0", value: "zh_male_qingshuangnanda_uranus_bigtts" },
  { label: "渊博小叔 2.0", value: "zh_male_yuanboxiaoshu_uranus_bigtts" },
  { label: "阳光青年 2.0", value: "zh_male_yangguangqingnian_uranus_bigtts" },
  { label: "清澈梓梓 2.0", value: "zh_female_qingchezizi_uranus_bigtts" },
  { label: "甜美悦悦 2.0", value: "zh_female_tianmeiyueyue_uranus_bigtts" },
  { label: "心灵鸡汤 2.0", value: "zh_female_xinlingjitang_uranus_bigtts" },
  { label: "温柔小哥 2.0", value: "zh_male_wenrouxiaoge_uranus_bigtts" },
  { label: "柔美女友 2.0", value: "zh_female_roumeinvyou_uranus_bigtts" },
  { label: "东方浩然 2.0", value: "zh_male_dongfanghaoran_uranus_bigtts" },
  { label: "温柔小雅 2.0", value: "zh_female_wenrouxiaoya_uranus_bigtts" },
  { label: "天才童声 2.0", value: "zh_male_tiancaitongsheng_uranus_bigtts" },
  { label: "武则天 2.0", value: "zh_female_wuzetian_uranus_bigtts" },
  { label: "顾姐 2.0", value: "zh_female_gujie_uranus_bigtts" },
  { label: "广告解说 2.0", value: "zh_male_guanggaojieshuo_uranus_bigtts" },
  { label: "少儿故事 2.0", value: "zh_female_shaoergushi_uranus_bigtts" },
  { label: "调皮公主", value: "saturn_zh_female_tiaopigongzhu_tob" },
  { label: "可爱女生", value: "saturn_zh_female_keainvsheng_tob" },
  { label: "爽朗少年", value: "saturn_zh_male_shuanglangshaonian_tob" },
  { label: "天才同桌", value: "saturn_zh_male_tiancaitongzhuo_tob" },
  { label: "知性灿灿", value: "saturn_zh_female_cancan_tob" },
  { label: "轻盈朵朵 2.0", value: "saturn_zh_female_qingyingduoduo_cs_tob" },
  { label: "温婉珊珊 2.0", value: "saturn_zh_female_wenwanshanshan_cs_tob" },
  { label: "热情艾娜 2.0", value: "saturn_zh_female_reqingaina_cs_tob" },
  { label: "清新沐沐 2.0", value: "saturn_zh_male_qingxinmumu_cs_tob" },
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
  { label: "moss_audio 女声 1", value: "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85" },
  { label: "moss_audio 女声 2", value: "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d" },
  { label: "moss_audio 英文男声 1", value: "moss_audio_6dc281eb-713c-11f0-a447-9613c873494c" },
  { label: "moss_audio 英文女声 1", value: "moss_audio_570551b1-735c-11f0-b236-0adeeecad052" },
  { label: "moss_audio 英文女声 2", value: "moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8" },
  { label: "moss_audio 日文 1", value: "moss_audio_24875c4a-7be4-11f0-9359-4e72c55db738" },
  { label: "moss_audio 日文 2", value: "moss_audio_7f4ee608-78ea-11f0-bb73-1e2a4cfcd245" },
  { label: "moss_audio 日文 3", value: "moss_audio_c1a6a3ac-7be6-11f0-8e8e-36b92fbb4f95" },
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

export const AUDIO_MIME_TYPE = "audio/mpeg";

export const AUDIO_BLOB_DB_NAME = "tts_audio_blobs";
export const AUDIO_BLOB_STORE_NAME = "blobs";
export const AUDIO_CACHE_MAX_BYTES = 1024 * 1024 * 1024; // 1GB
