import type {
  TTSRequestMessage,
  TTSResponseMessage,
  TTSCancelMessage,
  ExtensionMessage,
} from "./types.ts";

export function createTTSRequest(text: string): TTSRequestMessage {
  return { type: "TTS_REQUEST", text };
}

export function createTTSCancel(): TTSCancelMessage {
  return { type: "TTS_CANCEL" };
}

export function sendTTSRequest(text: string): Promise<TTSResponseMessage> {
  return chrome.runtime.sendMessage(createTTSRequest(text));
}

export function sendTTSCancel(): Promise<void> {
  return chrome.runtime.sendMessage(createTTSCancel());
}

export function isTTSRequest(msg: ExtensionMessage): msg is TTSRequestMessage {
  return msg.type === "TTS_REQUEST";
}

export function isTTSCancel(msg: ExtensionMessage): msg is TTSCancelMessage {
  return msg.type === "TTS_CANCEL";
}
