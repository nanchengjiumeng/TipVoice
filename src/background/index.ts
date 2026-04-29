import type { ExtensionMessage, TTSResponseMessage, TTSSettings } from "../shared/types.ts";
import { isTTSRequest, isTTSCancel } from "../shared/messages.ts";
import { getSettings } from "../shared/storage.ts";
import { getProvider } from "../lib/tts-client.ts";
import { TTSApiError, TTSNetworkError } from "../lib/provider.ts";
import { computeCacheKey, getCachedAudio, storeCachedAudio } from "../lib/audio-cache.ts";

const activeRequests = new Map<number, AbortController>();

let playingTabId: number | null = null;

function makeErrorResponse(error: string): TTSResponseMessage {
  return { type: "TTS_RESPONSE", success: false, error };
}

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Play TTS audio",
    });
  }
}

async function stopAudioInOffscreen() {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: "AUDIO_STOP" });
  } catch {
    // offscreen document may not exist yet, ignore
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function getVoiceId(settings: TTSSettings): string {
  if (settings.provider === "minimax") {
    return settings.minimax.voiceId;
  }
  return settings.volcengine.voiceType;
}

function getSpeechRate(settings: TTSSettings): number {
  if (settings.provider === "minimax") {
    return settings.minimax.speed;
  }
  return settings.volcengine.speechRate;
}

function getLoudnessRate(settings: TTSSettings): number {
  if (settings.provider === "minimax") {
    return settings.minimax.vol;
  }
  return settings.volcengine.loudnessRate;
}

function getMimeType(settings: TTSSettings): string {
  if (settings.provider === "minimax") {
    const format = settings.minimax.audioFormat;
    const map: Record<string, string> = {
      mp3: "audio/mpeg",
      pcm: "audio/pcm",
      flac: "audio/flac",
      wav: "audio/wav",
    };
    return map[format] ?? "audio/mpeg";
  }
  return "audio/mpeg";
}

async function handleTTSStreaming(text: string, tabId: number, signal: AbortSignal): Promise<void> {
  const settings = await getSettings();

  if (!getApiKey(settings)) {
    void chrome.tabs.sendMessage(tabId, { type: "AUDIO_STATE", state: "error" });
    return;
  }

  const mimeType = getMimeType(settings);

  try {
    const cacheKey = await computeCacheKey(
      text,
      settings.provider,
      getVoiceId(settings),
      getSpeechRate(settings),
      getLoudnessRate(settings),
    );

    const cachedBlob = await getCachedAudio(cacheKey);
    if (cachedBlob) {
      await ensureOffscreenDocument();
      const audioBase64 = await blobToBase64(cachedBlob);
      void chrome.runtime.sendMessage({
        type: "AUDIO_PLAY_CACHED",
        audioBase64,
        mimeType: cachedBlob.type || "audio/mpeg",
      });
      return;
    }
  } catch {
    // Cache lookup failed, proceed with API call
  }

  const chunks: Uint8Array[] = [];

  try {
    await ensureOffscreenDocument();
    void chrome.runtime.sendMessage({ type: "AUDIO_STREAM_START", mimeType });

    const provider = getProvider(settings);

    await provider.synthesizeStream(
      settings,
      text,
      (audioData: Uint8Array) => {
        chunks.push(audioData);
        const base64 = bytesToBase64(audioData);
        void chrome.runtime.sendMessage({ type: "AUDIO_CHUNK", chunk: base64 });
      },
      signal,
    );

    void chrome.runtime.sendMessage({ type: "AUDIO_END" });

    if (chunks.length > 0) {
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const cacheKey = await computeCacheKey(
        text,
        settings.provider,
        getVoiceId(settings),
        getSpeechRate(settings),
        getLoudnessRate(settings),
      );
      void storeCachedAudio({
        cacheKey,
        text,
        provider: settings.provider,
        voiceType: getVoiceId(settings),
        speechRate: getSpeechRate(settings),
        loudnessRate: getLoudnessRate(settings),
        audioBlob: new Blob([merged], { type: mimeType }),
      }).catch((err) => console.error("[Tip Voice] Failed to cache audio:", err));
    }
  } catch (err) {
    if (signal.aborted) return;

    void stopAudioInOffscreen();

    let errorMsg = "Unexpected error";
    if (err instanceof TTSApiError) {
      errorMsg = `TTS API error (${err.code}): ${err.message}`;
    } else if (err instanceof TTSNetworkError) {
      errorMsg = `Network error: ${err.message}`;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }

    console.error("[Tip Voice]", errorMsg);
    void chrome.tabs.sendMessage(tabId, { type: "AUDIO_STATE", state: "error" });
  }
}

function getApiKey(settings: TTSSettings): string {
  if (settings.provider === "minimax") {
    return settings.minimax.apiKey;
  }
  return settings.volcengine.apiKey;
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: TTSResponseMessage | undefined) => void,
  ) => {
    if (message.type === "AUDIO_STATE" && playingTabId != null) {
      void chrome.tabs.sendMessage(playingTabId, message);
      if (message.state === "ended" || message.state === "error") {
        playingTabId = null;
      }
      return false;
    }

    if (isTTSCancel(message)) {
      const tabId = sender.tab?.id;
      if (tabId != null) {
        activeRequests.get(tabId)?.abort();
        activeRequests.delete(tabId);
      }
      void stopAudioInOffscreen();
      playingTabId = null;
      sendResponse(undefined);
      return false;
    }

    if (isTTSRequest(message)) {
      const tabId = sender.tab?.id;

      if (tabId != null) {
        activeRequests.get(tabId)?.abort();
      }

      const controller = new AbortController();
      if (tabId != null) {
        activeRequests.set(tabId, controller);
      }

      getSettings()
        .then((settings) => {
          if (!getApiKey(settings)) {
            sendResponse(makeErrorResponse("Please configure API Key in the extension popup"));
            return;
          }

          sendResponse({ type: "TTS_RESPONSE", success: true });

          if (tabId != null) {
            playingTabId = tabId;
          }

          void handleTTSStreaming(message.text, tabId ?? -1, controller.signal).finally(() => {
            if (tabId != null) {
              activeRequests.delete(tabId);
            }
          });
        })
        .catch(() => {
          sendResponse(makeErrorResponse("Failed to load settings"));
        });

      return true; // async sendResponse
    }

    return false;
  },
);
