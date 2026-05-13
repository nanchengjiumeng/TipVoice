import type {
  ExtensionMessage,
  FetchAudioResponseMessage,
  TTSResponseMessage,
  TTSSettings,
  TranslationResponseMessage,
} from "../shared/types.ts";
import { isTTSRequest, isTTSCancel, isTranslationRequest } from "../shared/messages.ts";
import { getSettings, getTranslationSettings } from "../shared/storage.ts";
import { getProvider } from "../lib/tts-client.ts";
import { TTSApiError, TTSNetworkError } from "../lib/provider.ts";
import { computeCacheKey, getCachedAudio, storeCachedAudio } from "../lib/audio-cache.ts";
import {
  computeTranslationCacheKey,
  getCachedTranslation,
  storeCachedTranslation,
} from "../lib/cache.ts";
import { translationProvider } from "../lib/translation-provider.ts";

const activeRequests = new Map<number, AbortController>();
const activeTranslationRequests = new Map<string, AbortController[]>();
const activeTranslationTabRequests = new Map<number, AbortController[]>();
const TRANSLATION_IDLE_TIMEOUT_MS = 5_000;

let playingTabId: number | null = null;

const log = (...args: unknown[]) => console.debug("[Tip Voice][background]", ...args);
const warn = (...args: unknown[]) => console.warn("[Tip Voice][background]", ...args);
const error = (...args: unknown[]) => console.error("[Tip Voice][background]", ...args);

function makeErrorResponse(error: string): TTSResponseMessage {
  return { type: "TTS_RESPONSE", success: false, error };
}

function makeTranslationSuccessResponse(results: string): TranslationResponseMessage {
  return { type: "TRANSLATION_RESPONSE", success: true, result: results };
}

function makeTranslationErrorStreamMessage(
  requestId: string,
  error: string,
  profileName = "翻译错误",
): ExtensionMessage {
  return {
    type: "TRANSLATION_STREAM_ERROR",
    requestId,
    profileId: "error",
    profileName,
    error,
  };
}

function sendTranslationMessage(tabId: number | undefined, message: ExtensionMessage): void {
  if (tabId == null) return;
  log("send translation message", {
    tabId,
    type: message.type,
    requestId: "requestId" in message ? message.requestId : undefined,
    profileName: "profileName" in message ? message.profileName : undefined,
  });
  void chrome.tabs.sendMessage(tabId, message).catch(() => {
    warn("failed to send translation message; content script may be gone", {
      tabId,
      type: message.type,
    });
  });
}

async function ensureOffscreenDocument() {
  log("ensure offscreen document");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (contexts.length === 0) {
    log("create offscreen document");
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Play TTS audio",
    });
  }
}

async function stopAudioInOffscreen() {
  try {
    log("stop audio in offscreen");
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
  log("tts stream start", { tabId, textLength: text.length });
  const settings = await getSettings();
  log("tts settings loaded", {
    tabId,
    provider: settings.provider,
    hasApiKey: Boolean(getApiKey(settings)),
  });

  if (!getApiKey(settings)) {
    warn("tts missing api key", { tabId, provider: settings.provider });
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
      log("tts cache hit", { tabId, provider: settings.provider, bytes: cachedBlob.size });
      await ensureOffscreenDocument();
      const audioBase64 = await blobToBase64(cachedBlob);
      log("tts play cached audio");
      void chrome.runtime.sendMessage({
        type: "AUDIO_PLAY_CACHED",
        audioBase64,
        mimeType: cachedBlob.type || "audio/mpeg",
      });
      return;
    }
    log("tts cache miss", { tabId, provider: settings.provider });
  } catch (err) {
    warn("tts cache lookup failed; continuing with api", err);
    // Cache lookup failed, proceed with API call
  }

  const chunks: Uint8Array[] = [];

  try {
    await ensureOffscreenDocument();
    log("tts send AUDIO_STREAM_START", { tabId, mimeType });
    void chrome.runtime.sendMessage({ type: "AUDIO_STREAM_START", mimeType });

    const provider = getProvider(settings);

    await provider.synthesizeStream(
      settings,
      text,
      (audioData: Uint8Array) => {
        log("tts audio chunk", { tabId, bytes: audioData.byteLength });
        chunks.push(audioData);
        const base64 = bytesToBase64(audioData);
        void chrome.runtime.sendMessage({ type: "AUDIO_CHUNK", chunk: base64 });
      },
      signal,
    );

    log("tts send AUDIO_END", { tabId, chunks: chunks.length });
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
      })
        .then(() => log("tts audio cached", { tabId, bytes: merged.byteLength }))
        .catch((err) => error("failed to cache audio", err));
    }
  } catch (err) {
    if (signal.aborted) {
      log("tts stream aborted", { tabId });
      return;
    }

    void stopAudioInOffscreen();

    let errorMsg = "Unexpected error";
    if (err instanceof TTSApiError) {
      errorMsg = `TTS API error (${err.code}): ${err.message}`;
    } else if (err instanceof TTSNetworkError) {
      errorMsg = `Network error: ${err.message}`;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }

    error("tts stream failed", { tabId, error: errorMsg });
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
    sendResponse: (
      response:
        | TTSResponseMessage
        | TranslationResponseMessage
        | FetchAudioResponseMessage
        | undefined,
    ) => void,
  ) => {
    if (message.type === "AUDIO_STATE" && playingTabId != null) {
      log("audio state from offscreen", { playingTabId, state: message.state });
      void chrome.tabs.sendMessage(playingTabId, message);
      if (message.state === "ended" || message.state === "error") {
        playingTabId = null;
      }
      return false;
    }

    if (message.type === "FETCH_AUDIO_URL") {
      /* Background fetches audio (no CORS restriction) and returns base64 to content script */
      log("fetch audio url request", { url: message.url });
      fetch(message.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const mimeType = res.headers.get("content-type") || "audio/mpeg";
          return res.blob().then((blob) => ({ blob, mimeType }));
        })
        .then(({ blob, mimeType }) =>
          blobToBase64(blob).then((audioBase64) => ({ audioBase64, mimeType })),
        )
        .then(({ audioBase64, mimeType }) => {
          sendResponse({ type: "FETCH_AUDIO_RESPONSE", audioBase64, mimeType });
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          error("fetch audio url failed", errorMsg);
          sendResponse({ type: "FETCH_AUDIO_RESPONSE", error: errorMsg });
        });
      return true; /* async sendResponse */
    }

    if (isTTSCancel(message)) {
      const tabId = sender.tab?.id;
      log("tts cancel received", { tabId });
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
      log("tts request received", { tabId, textLength: message.text.length });

      if (tabId != null) {
        log("abort previous tts request for tab", { tabId });
        activeRequests.get(tabId)?.abort();
      }

      const controller = new AbortController();
      if (tabId != null) {
        activeRequests.set(tabId, controller);
      }

      getSettings()
        .then((settings) => {
          log("tts request settings loaded", {
            tabId,
            provider: settings.provider,
            hasApiKey: Boolean(getApiKey(settings)),
          });
          if (!getApiKey(settings)) {
            sendResponse(makeErrorResponse("Please configure API Key in the extension popup"));
            return;
          }

          log("tts request ack success", { tabId });
          sendResponse({ type: "TTS_RESPONSE", success: true });

          if (tabId != null) {
            playingTabId = tabId;
          }

          void handleTTSStreaming(message.text, tabId ?? -1, controller.signal).finally(() => {
            log("tts request cleanup", { tabId });
            if (tabId != null && activeRequests.get(tabId) === controller) {
              activeRequests.delete(tabId);
            }
          });
        })
        .catch((err) => {
          error("tts settings load failed", err);
          sendResponse(makeErrorResponse("Failed to load settings"));
        });

      return true;
    }

    if (isTranslationRequest(message)) {
      const tabId = sender.tab?.id;
      log("translation request received", {
        tabId,
        requestId: message.requestId,
        textLength: message.text.length,
      });
      activeTranslationRequests.get(message.requestId)?.forEach((controller) => controller.abort());
      const requestControllers: AbortController[] = [];
      activeTranslationRequests.set(message.requestId, requestControllers);
      if (tabId != null) {
        const previous = activeTranslationTabRequests.get(tabId);
        if (previous?.length) {
          log("abort previous translation requests for tab", { tabId, count: previous.length });
          previous.forEach((controller) => controller.abort());
        }
        activeTranslationTabRequests.set(tabId, requestControllers);
      }

      log("translation request ack success", { requestId: message.requestId });
      sendResponse(makeTranslationSuccessResponse(""));

      getTranslationSettings()
        .then(async (translationSettings) => {
          log("translation settings loaded", {
            requestId: message.requestId,
            activeProfileIds: translationSettings.activeTranslationProfileIds,
          });
          const activeIds = new Set(translationSettings.activeTranslationProfileIds);
          const profiles = translationSettings.translationProfiles.filter((profile) =>
            activeIds.has(profile.id),
          );

          if (profiles.length === 0) {
            warn("translation no active profiles", { requestId: message.requestId });
            sendTranslationMessage(
              tabId,
              makeTranslationErrorStreamMessage(
                message.requestId,
                "No translation profiles configured",
              ),
            );
            sendTranslationMessage(tabId, {
              type: "TRANSLATION_STREAM_DONE",
              requestId: message.requestId,
            });
            activeTranslationRequests.delete(message.requestId);
            if (tabId != null && activeTranslationTabRequests.get(tabId) === requestControllers) {
              activeTranslationTabRequests.delete(tabId);
            }
            return;
          }

          log("translation profiles ready", {
            requestId: message.requestId,
            profiles: profiles.map((profile) => ({
              id: profile.id,
              name: profile.name,
              provider: profile.provider,
            })),
          });
          sendTranslationMessage(tabId, {
            type: "TRANSLATION_STREAM_START",
            requestId: message.requestId,
            profiles: profiles.map((profile) => ({ id: profile.id, name: profile.name })),
          });

          void Promise.allSettled(
            profiles.map(async (profile) => {
              log("translation profile start", {
                requestId: message.requestId,
                profileName: profile.name,
                provider: profile.provider,
              });
              let result = "";
              const controller = new AbortController();
              activeTranslationRequests.get(message.requestId)?.push(controller);
              let idleTimeout: ReturnType<typeof setTimeout> | null = null;
              const armIdleTimeout = () => {
                if (idleTimeout) clearTimeout(idleTimeout);
                idleTimeout = setTimeout(() => {
                  warn("translation idle timeout, aborting profile", {
                    requestId: message.requestId,
                    profileName: profile.name,
                    timeoutMs: TRANSLATION_IDLE_TIMEOUT_MS,
                  });
                  controller.abort();
                }, TRANSLATION_IDLE_TIMEOUT_MS);
              };
              const clearIdleTimeout = () => {
                if (idleTimeout) {
                  clearTimeout(idleTimeout);
                  idleTimeout = null;
                }
              };

              try {
                const cacheKey = await computeTranslationCacheKey(
                  message.text,
                  profile.provider,
                  profile.id,
                );
                const cachedTranslation = await getCachedTranslation(cacheKey);
                if (controller.signal.aborted) return;
                if (cachedTranslation) {
                  log("translation cache hit", {
                    requestId: message.requestId,
                    profileName: profile.name,
                    resultLength: cachedTranslation.length,
                  });
                  sendTranslationMessage(tabId, {
                    type: "TRANSLATION_STREAM_CHUNK",
                    requestId: message.requestId,
                    profileId: profile.id,
                    profileName: profile.name,
                    chunk: cachedTranslation,
                    result: cachedTranslation,
                  });
                  sendTranslationMessage(tabId, {
                    type: "TRANSLATION_STREAM_END",
                    requestId: message.requestId,
                    profileId: profile.id,
                    profileName: profile.name,
                    result: cachedTranslation,
                  });
                  return;
                }
                log("translation cache miss", {
                  requestId: message.requestId,
                  profileName: profile.name,
                });

                armIdleTimeout();
                result = await translationProvider.translateStream(
                  profile,
                  message.text,
                  (chunk, accumulated) => {
                    log("translation provider chunk", {
                      requestId: message.requestId,
                      profileName: profile.name,
                      chunkLength: chunk.length,
                      resultLength: accumulated.length,
                    });
                    armIdleTimeout();
                    sendTranslationMessage(tabId, {
                      type: "TRANSLATION_STREAM_CHUNK",
                      requestId: message.requestId,
                      profileId: profile.id,
                      profileName: profile.name,
                      chunk,
                      result: accumulated,
                    });
                  },
                  controller.signal,
                );
                log("translation provider finished", {
                  requestId: message.requestId,
                  profileName: profile.name,
                  resultLength: result.length,
                });
                sendTranslationMessage(tabId, {
                  type: "TRANSLATION_STREAM_END",
                  requestId: message.requestId,
                  profileId: profile.id,
                  profileName: profile.name,
                  result,
                });
                try {
                  await storeCachedTranslation({
                    cacheKey,
                    text: message.text,
                    provider: profile.provider,
                    profileId: profile.id,
                    profileName: profile.name,
                    result,
                  });
                  log("translation cached", {
                    requestId: message.requestId,
                    profileName: profile.name,
                  });
                } catch (err) {
                  error("failed to cache translation", err);
                }
              } catch (err) {
                let errorMsg = "Translation failed";
                if (controller.signal.aborted) {
                  errorMsg = "5 秒内没有收到新的翻译内容，已停止";
                } else if (err instanceof Error) {
                  errorMsg = err.message;
                }
                error("translation profile failed", {
                  requestId: message.requestId,
                  profileName: profile.name,
                  error: errorMsg,
                });
                sendTranslationMessage(tabId, {
                  type: "TRANSLATION_STREAM_ERROR",
                  requestId: message.requestId,
                  profileId: profile.id,
                  profileName: profile.name,
                  error: errorMsg,
                });
              } finally {
                clearIdleTimeout();
                log("translation profile cleanup", {
                  requestId: message.requestId,
                  profileName: profile.name,
                });
              }
            }),
          ).finally(() => {
            log("translation request done", { requestId: message.requestId });
            activeTranslationRequests.delete(message.requestId);
            if (tabId != null && activeTranslationTabRequests.get(tabId) === requestControllers) {
              activeTranslationTabRequests.delete(tabId);
            }
            sendTranslationMessage(tabId, {
              type: "TRANSLATION_STREAM_DONE",
              requestId: message.requestId,
            });
          });
        })
        .catch((err) => {
          error("translation settings load failed", err);
          activeTranslationRequests.delete(message.requestId);
          if (tabId != null) activeTranslationTabRequests.delete(tabId);
          sendTranslationMessage(
            tabId,
            makeTranslationErrorStreamMessage(
              message.requestId,
              "Failed to load translation settings",
            ),
          );
          sendTranslationMessage(tabId, {
            type: "TRANSLATION_STREAM_DONE",
            requestId: message.requestId,
          });
        });

      return true;
    }

    return false;
  },
);
