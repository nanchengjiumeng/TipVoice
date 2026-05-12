import type {
  AudioStateMessage,
  ExtensionMessage,
  PlaybackState,
  TranslationStreamChunkMessage,
  TranslationStreamDoneMessage,
  TranslationStreamEndMessage,
  TranslationStreamErrorMessage,
  TranslationStreamStartMessage,
} from "../shared/types.ts";
import { dispatchTranslationRequest, sendTTSRequest, sendTTSCancel } from "../shared/messages.ts";
import { FloatingButton } from "./floating-button.ts";
import { TranslateButton, TranslationUI } from "./translation-ui.tsx";

const floatingButton = new FloatingButton();
const translateButton = new TranslateButton();
const translationUI = new TranslationUI();
let currentState: PlaybackState = "idle";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let ttsWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
let activeTranslationRequestId: string | null = null;
let translationStartTimer: ReturnType<typeof setTimeout> | null = null;
const pendingTranslationProfiles = new Map<string, string>();
const translationIdleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TRANSLATION_IDLE_TIMEOUT_MS = 5_000;
const TRANSLATION_ACK_TIMEOUT_MS = 8_000;
const TTS_PLAYBACK_TIMEOUT_MS = 10_000;

const log = (...args: unknown[]) => console.debug("[Tip Voice][content]", ...args);
const warn = (...args: unknown[]) => console.warn("[Tip Voice][content]", ...args);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function setState(state: PlaybackState) {
  log("set playback state", { from: currentState, to: state });
  currentState = state;
  floatingButton.setState(state);

  if (state === "error") {
    setTimeout(() => {
      if (currentState === "error") {
        floatingButton.hide();
        currentState = "idle";
      }
    }, 2000);
  }
}

function armTTSWatchdog(): void {
  clearTTSWatchdog();
  log("tts watchdog armed", { timeoutMs: TTS_PLAYBACK_TIMEOUT_MS });
  ttsWatchdogTimer = setTimeout(() => {
    if (currentState !== "loading") return;
    warn("tts watchdog timeout: no AUDIO_STATE received");
    void sendTTSCancel().catch((err) => warn("tts watchdog cancel failed", err));
    setState("error");
  }, TTS_PLAYBACK_TIMEOUT_MS);
}

function clearTTSWatchdog(): void {
  if (!ttsWatchdogTimer) return;
  clearTimeout(ttsWatchdogTimer);
  ttsWatchdogTimer = null;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "AUDIO_STATE") {
    handleTranslationStreamMessage(message);
    return;
  }

  log("audio state received", message);
  clearTTSWatchdog();
  if (message.state === "playing") {
    setState("playing");
  } else if (message.state === "ended") {
    setState("idle");
  } else if (message.state === "error") {
    setState("error");
  }
});

function handleTranslationStreamMessage(
  message:
    | Exclude<ExtensionMessage, AudioStateMessage>
    | TranslationStreamStartMessage
    | TranslationStreamChunkMessage
    | TranslationStreamEndMessage
    | TranslationStreamErrorMessage
    | TranslationStreamDoneMessage,
): void {
  if (
    message.type !== "TRANSLATION_STREAM_START" &&
    message.type !== "TRANSLATION_STREAM_CHUNK" &&
    message.type !== "TRANSLATION_STREAM_END" &&
    message.type !== "TRANSLATION_STREAM_ERROR" &&
    message.type !== "TRANSLATION_STREAM_DONE"
  ) {
    return;
  }

  if (message.requestId !== activeTranslationRequestId) return;

  if (message.type === "TRANSLATION_STREAM_START") {
    log("translation stream start", {
      requestId: message.requestId,
      profiles: message.profiles.map((profile) => profile.name),
    });
    clearTranslationStartTimer();
    pendingTranslationProfiles.clear();
    for (const profile of message.profiles) {
      pendingTranslationProfiles.set(profile.id, profile.name);
      armTranslationIdleTimer(message.requestId, profile.id, profile.name);
    }
    translationUI.setLoading(message.profiles);
    return;
  }

  if (message.type === "TRANSLATION_STREAM_CHUNK") {
    if (!pendingTranslationProfiles.has(message.profileId)) return;
    log("translation stream chunk", {
      requestId: message.requestId,
      profileName: message.profileName,
      chunkLength: message.chunk.length,
      resultLength: message.result.length,
    });
    armTranslationIdleTimer(message.requestId, message.profileId, message.profileName);
    translationUI.updateResult(message.profileId, {
      profileId: message.profileId,
      profileName: message.profileName,
      result: message.result,
      pending: true,
    });
    return;
  }

  if (message.type === "TRANSLATION_STREAM_END") {
    log("translation stream end", {
      requestId: message.requestId,
      profileName: message.profileName,
      resultLength: message.result.length,
    });
    pendingTranslationProfiles.delete(message.profileId);
    clearTranslationIdleTimer(message.profileId);
    translationUI.updateResult(message.profileId, {
      profileId: message.profileId,
      profileName: message.profileName,
      result: message.result,
    });
    return;
  }

  if (message.type === "TRANSLATION_STREAM_DONE") {
    log("translation stream done", { requestId: message.requestId });
    clearTranslationStartTimer();
    for (const [profileId, profileName] of pendingTranslationProfiles) {
      clearTranslationIdleTimer(profileId);
      translationUI.updateResult(profileId, {
        profileId,
        profileName,
        result: "",
        error: "翻译未返回完成状态，请重试",
      });
    }
    pendingTranslationProfiles.clear();
    return;
  }

  warn("translation stream error", {
    requestId: message.requestId,
    profileName: message.profileName,
    error: message.error,
  });
  clearTranslationStartTimer();
  pendingTranslationProfiles.delete(message.profileId);
  clearTranslationIdleTimer(message.profileId);
  translationUI.updateResult(message.profileId, {
    profileId: message.profileId,
    profileName: message.profileName,
    result: "",
    error: message.error,
  });
}

function armTranslationIdleTimer(requestId: string, profileId: string, profileName: string): void {
  clearTranslationIdleTimer(profileId);
  log("translation idle timer armed", {
    requestId,
    profileName,
    timeoutMs: TRANSLATION_IDLE_TIMEOUT_MS,
  });
  const timer = setTimeout(() => {
    if (requestId !== activeTranslationRequestId) return;
    if (!pendingTranslationProfiles.has(profileId)) return;
    warn("translation idle timeout", { requestId, profileName });
    pendingTranslationProfiles.delete(profileId);
    translationIdleTimers.delete(profileId);
    translationUI.updateResult(profileId, {
      profileId,
      profileName,
      result: "",
      error: "5 秒内没有收到新的翻译内容，已停止",
    });
  }, TRANSLATION_IDLE_TIMEOUT_MS);
  translationIdleTimers.set(profileId, timer);
}

function armTranslationStartTimer(requestId: string): void {
  clearTranslationStartTimer();
  log("translation dispatch timer armed", { requestId, timeoutMs: TRANSLATION_IDLE_TIMEOUT_MS });
  translationStartTimer = setTimeout(() => {
    if (requestId !== activeTranslationRequestId) return;
    if (pendingTranslationProfiles.size > 0) return;
    warn("translation dispatch timeout", { requestId });
    translationUI.clearResults();
    translationUI.addResult({
      profileId: "error",
      profileName: "翻译错误",
      result: "",
      error: "5 秒内后台没有确认收到翻译请求，请检查扩展 Service Worker 控制台",
    });
  }, TRANSLATION_IDLE_TIMEOUT_MS);
}

function clearTranslationStartTimer(): void {
  if (!translationStartTimer) return;
  clearTimeout(translationStartTimer);
  translationStartTimer = null;
}

function clearTranslationIdleTimer(profileId: string): void {
  const timer = translationIdleTimers.get(profileId);
  if (!timer) return;
  clearTimeout(timer);
  translationIdleTimers.delete(profileId);
}

function clearAllTranslationIdleTimers(): void {
  for (const timer of translationIdleTimers.values()) {
    clearTimeout(timer);
  }
  translationIdleTimers.clear();
}

async function handleButtonClick() {
  log("tts button clicked", { state: currentState });
  if (currentState === "playing" || currentState === "loading") {
    log("tts cancel requested");
    clearTTSWatchdog();
    void sendTTSCancel().catch((err) => warn("tts cancel failed", err));
    setState("idle");
    return;
  }

  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text) {
    log("tts skipped: empty selection");
    return;
  }

  log("tts request sending", { textLength: text.length });
  setState("loading");
  armTTSWatchdog();

  let response;
  try {
    response = await withTimeout(
      sendTTSRequest(text),
      TRANSLATION_ACK_TIMEOUT_MS,
      "朗读请求没有收到后台确认",
    );
  } catch (err) {
    warn("tts request failed before ack", err);
    clearTTSWatchdog();
    setState("error");
    return;
  }

  log("tts response received", response);

  if (!response || !response.success) {
    warn(response?.error ?? "No response from background");
    clearTTSWatchdog();
    setState("error");
    return;
  }

  if ((currentState as PlaybackState) !== "loading") return;
}

async function handleTranslateClick() {
  log("translation button clicked");
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text) {
    log("translation skipped: empty selection");
    return;
  }

  translateButton.hide();

  const range = selection!.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  translationUI.show(rect.left, rect.bottom + 8);
  translationUI.setLoading([{ id: "loading", name: "翻译中..." }]);

  const requestId = `translation_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  pendingTranslationProfiles.clear();
  clearAllTranslationIdleTimers();
  activeTranslationRequestId = requestId;
  armTranslationStartTimer(requestId);
  log("translation request sending", { requestId, textLength: text.length });

  dispatchTranslationRequest(text, requestId, (dispatchError) => {
    if (requestId !== activeTranslationRequestId) return;
    clearTranslationStartTimer();
    if (!dispatchError) {
      log("translation background acknowledged", { requestId });
      return;
    }
    warn("translation dispatch failed", { requestId, error: dispatchError });
    translationUI.clearResults();
    translationUI.addResult({
      profileId: "error",
      profileName: "翻译错误",
      result: "",
      error: `翻译请求没有送达后台：${dispatchError}`,
    });
  });
}

floatingButton.onClick(handleButtonClick);
translateButton.onClick(handleTranslateClick);

document.addEventListener("mouseup", (e) => {
  if (
    floatingButton.getHost().contains(e.target as Node) ||
    translateButton.getHost().contains(e.target as Node) ||
    translationUI.getHost().contains(e.target as Node)
  ) {
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text) {
      if (currentState === "idle") {
        floatingButton.hide();
      }
      translateButton.hide();
      return;
    }

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const ttsX = rect.right + 4;
    const ttsY = rect.top - 36;

    const translateX = rect.right + 40;
    const translateY = rect.top - 36;

    floatingButton.show(ttsX, ttsY);
    translateButton.show(translateX, translateY);

    if (currentState !== "playing" && currentState !== "loading") {
      setState("idle");
    }
  }, 100);
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text && currentState === "idle") {
    floatingButton.hide();
    translateButton.hide();
    if (!translationUI.isFixed()) {
      return;
    }
  }
});
