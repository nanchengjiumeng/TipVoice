import type {
  TTSRequestMessage,
  TTSResponseMessage,
  TTSCancelMessage,
  ExtensionMessage,
  TranslationRequestMessage,
  TranslationResponseMessage,
} from "./types.ts";

export function createTTSRequest(text: string): TTSRequestMessage {
  return { type: "TTS_REQUEST", text };
}

export function createTTSCancel(): TTSCancelMessage {
  return { type: "TTS_CANCEL" };
}

export function createTranslationRequest(
  text: string,
  requestId: string,
): TranslationRequestMessage {
  return { type: "TRANSLATION_REQUEST", requestId, text };
}

export function sendTTSRequest(text: string): Promise<TTSResponseMessage> {
  return chrome.runtime.sendMessage(createTTSRequest(text));
}

export function sendTTSCancel(): Promise<void> {
  return chrome.runtime.sendMessage(createTTSCancel());
}

export function sendTranslationRequest(
  text: string,
  requestId: string,
): Promise<TranslationResponseMessage> {
  return chrome.runtime.sendMessage(createTranslationRequest(text, requestId));
}

export function dispatchTranslationRequest(
  text: string,
  requestId: string,
  onSettled?: (error?: string) => void,
): void {
  chrome.runtime.sendMessage(createTranslationRequest(text, requestId), () => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.warn("[Tip Voice][content] translation message dispatch failed", {
        requestId,
        error: lastError.message,
      });
      onSettled?.(lastError.message);
    } else {
      console.debug("[Tip Voice][content] translation message dispatched", { requestId });
      onSettled?.();
    }
  });
}

export function isTTSRequest(msg: ExtensionMessage): msg is TTSRequestMessage {
  return msg.type === "TTS_REQUEST";
}

export function isTTSCancel(msg: ExtensionMessage): msg is TTSCancelMessage {
  return msg.type === "TTS_CANCEL";
}

export function isTranslationRequest(msg: ExtensionMessage): msg is TranslationRequestMessage {
  return msg.type === "TRANSLATION_REQUEST";
}
