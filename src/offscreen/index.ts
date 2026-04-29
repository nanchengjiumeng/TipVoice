import type {
  AudioStreamStartMessage,
  AudioChunkMessage,
  AudioEndMessage,
  AudioStopMessage,
  AudioPlayCachedMessage,
} from "../shared/types.ts";

type OffscreenMessage =
  | AudioStreamStartMessage
  | AudioChunkMessage
  | AudioEndMessage
  | AudioStopMessage
  | AudioPlayCachedMessage;

let currentMimeType = "audio/mpeg";
let mediaSource: MediaSource | null = null;
let sourceBuffer: SourceBuffer | null = null;
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let pendingBuffers: Uint8Array[] = [];
let accumulatedData: Uint8Array[] = [];
let streamEnded = false;
let playbackStarted = false;
let usingMediaSource = false;

function cleanup() {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  mediaSource = null;
  sourceBuffer = null;
  pendingBuffers = [];
  accumulatedData = [];
  streamEnded = false;
  playbackStarted = false;
  usingMediaSource = false;
}

function sendState(state: "playing" | "ended" | "error") {
  void chrome.runtime.sendMessage({ type: "AUDIO_STATE", state });
}

function onAudioEnded() {
  cleanup();
  sendState("ended");
}

function onAudioError() {
  cleanup();
  sendState("error");
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function processQueue() {
  if (!sourceBuffer || sourceBuffer.updating) return;

  if (pendingBuffers.length > 0) {
    const chunk = pendingBuffers.shift()!;
    try {
      sourceBuffer.appendBuffer(chunk as BufferSource);
    } catch {
      usingMediaSource = false;
    }
    return;
  }

  if (!playbackStarted && audio && sourceBuffer.buffered.length > 0) {
    playbackStarted = true;
    audio
      .play()
      .then(() => sendState("playing"))
      .catch(() => onAudioError());
  }

  if (streamEnded && mediaSource?.readyState === "open") {
    try {
      mediaSource.endOfStream();
    } catch {
      // ignore
    }
  }
}

function initStream(mimeType: string) {
  cleanup();
  currentMimeType = mimeType;

  usingMediaSource = typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(mimeType);

  if (usingMediaSource) {
    mediaSource = new MediaSource();
    audio = new Audio();
    objectUrl = URL.createObjectURL(mediaSource);
    audio.src = objectUrl;

    audio.addEventListener("ended", onAudioEnded);
    audio.addEventListener("error", onAudioError);

    mediaSource.addEventListener("sourceopen", () => {
      try {
        sourceBuffer = mediaSource!.addSourceBuffer(mimeType);
        sourceBuffer.addEventListener("updateend", processQueue);
        processQueue();
      } catch {
        usingMediaSource = false;
      }
    });
  }
}

function appendChunk(base64: string) {
  const bytes = base64ToBytes(base64);

  accumulatedData.push(bytes);

  if (usingMediaSource) {
    pendingBuffers.push(bytes);
    processQueue();
  }
}

function endStream() {
  streamEnded = true;

  if (usingMediaSource) {
    processQueue();
  } else {
    playAccumulated();
  }
}

function playAccumulated() {
  if (accumulatedData.length === 0) {
    sendState("error");
    return;
  }

  const totalLength = accumulatedData.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of accumulatedData) {
    merged.set(arr, offset);
    offset += arr.length;
  }

  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  mediaSource = null;
  sourceBuffer = null;

  const blob = new Blob([merged], { type: currentMimeType });
  objectUrl = URL.createObjectURL(blob);
  audio = new Audio(objectUrl);

  audio.addEventListener("ended", onAudioEnded);
  audio.addEventListener("error", onAudioError);

  audio
    .play()
    .then(() => sendState("playing"))
    .catch(() => onAudioError());
}

function playCachedAudio(audioBase64: string, mimeType: string) {
  cleanup();
  currentMimeType = mimeType || "audio/mpeg";

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: currentMimeType });
  objectUrl = URL.createObjectURL(blob);
  audio = new Audio(objectUrl);

  audio.addEventListener("ended", onAudioEnded);
  audio.addEventListener("error", onAudioError);

  audio
    .play()
    .then(() => sendState("playing"))
    .catch(() => onAudioError());
}

chrome.runtime.onMessage.addListener((message: OffscreenMessage) => {
  if (message.type === "AUDIO_STREAM_START") {
    initStream(message.mimeType || "audio/mpeg");
    return;
  }

  if (message.type === "AUDIO_CHUNK") {
    appendChunk(message.chunk);
    return;
  }

  if (message.type === "AUDIO_END") {
    endStream();
    return;
  }

  if (message.type === "AUDIO_STOP") {
    cleanup();
    return;
  }

  if (message.type === "AUDIO_PLAY_CACHED") {
    playCachedAudio(message.audioBase64, message.mimeType || "audio/mpeg");
    return;
  }
});
