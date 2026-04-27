import type { ExtensionMessage, TTSResponseMessage } from "../shared/types.ts";
import { isTTSRequest, isTTSCancel } from "../shared/messages.ts";
import { getSettings } from "../shared/storage.ts";
import { synthesizeStream, TTSApiError, TTSNetworkError } from "../lib/tts-client.ts";
import { computeCacheKey, getCachedAudio, storeCachedAudio } from "../lib/audio-cache.ts";

const activeRequests = new Map<number, AbortController>();

// Track which tab is currently playing audio
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
      // result is "data:audio/mpeg;base64,XXXX", extract base64 part
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function handleTTSStreaming(text: string, tabId: number, signal: AbortSignal): Promise<void> {
  const settings = await getSettings();

  // Validate credentials
  if (!settings.apiKey) {
    void chrome.tabs.sendMessage(tabId, { type: "AUDIO_STATE", state: "error" });
    return;
  }

  // Check cache first
  try {
    const cacheKey = await computeCacheKey(
      text,
      settings.voiceType,
      settings.speechRate,
      settings.loudnessRate,
    );

    const cachedBlob = await getCachedAudio(cacheKey);
    if (cachedBlob) {
      // Cache hit — play directly
      await ensureOffscreenDocument();
      const audioBase64 = await blobToBase64(cachedBlob);
      void chrome.runtime.sendMessage({ type: "AUDIO_PLAY_CACHED", audioBase64 });
      return;
    }
  } catch {
    // Cache lookup failed, proceed with API call
  }

  // Cache miss — stream from API
  const chunks: Uint8Array[] = [];

  try {
    await ensureOffscreenDocument();
    void chrome.runtime.sendMessage({ type: "AUDIO_STREAM_START" });

    await synthesizeStream(
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

    // Store in cache (fire-and-forget)
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
        settings.voiceType,
        settings.speechRate,
        settings.loudnessRate,
      );
      void storeCachedAudio({
        cacheKey,
        text,
        voiceType: settings.voiceType,
        speechRate: settings.speechRate,
        loudnessRate: settings.loudnessRate,
        audioBlob: new Blob([merged], { type: "audio/mpeg" }),
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

// Listen for messages from content scripts, offscreen, and popup
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: TTSResponseMessage | undefined) => void,
  ) => {
    // Forward audio state from offscreen to the content script tab
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

      // Abort any existing request for this tab
      if (tabId != null) {
        activeRequests.get(tabId)?.abort();
      }

      const controller = new AbortController();
      if (tabId != null) {
        activeRequests.set(tabId, controller);
      }

      // Validate and respond immediately, then start streaming
      getSettings()
        .then((settings) => {
          if (!settings.apiKey) {
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
