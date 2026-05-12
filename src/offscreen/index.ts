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

const log = (...args: unknown[]) => console.debug("[Tip Voice][offscreen]", ...args);
const warn = (...args: unknown[]) => console.warn("[Tip Voice][offscreen]", ...args);

function cleanup() {
  log("cleanup audio state");
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
  log("send audio state", { state });
  void chrome.runtime.sendMessage({ type: "AUDIO_STATE", state });
}

function onAudioEnded() {
  log("audio ended");
  cleanup();
  sendState("ended");
}

function onAudioError() {
  warn("audio error");
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
      log("append source buffer", { bytes: chunk.byteLength, remaining: pendingBuffers.length });
      sourceBuffer.appendBuffer(chunk as BufferSource);
    } catch {
      warn("append source buffer failed; fallback to accumulated playback");
      usingMediaSource = false;
    }
    return;
  }

  if (!playbackStarted && audio && sourceBuffer.buffered.length > 0) {
    playbackStarted = true;
    log("start media source playback");
    audio
      .play()
      .then(() => sendState("playing"))
      .catch((err) => {
        warn("media source playback failed", err);
        onAudioError();
      });
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
  log("init stream", { mimeType });
  cleanup();
  currentMimeType = mimeType;

  usingMediaSource = typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(mimeType);
  log("media source support", { mimeType, usingMediaSource });

  if (usingMediaSource) {
    mediaSource = new MediaSource();
    audio = new Audio();
    objectUrl = URL.createObjectURL(mediaSource);
    audio.src = objectUrl;

    audio.addEventListener("ended", onAudioEnded);
    audio.addEventListener("error", onAudioError);

    mediaSource.addEventListener("sourceopen", () => {
      try {
        log("media source open");
        sourceBuffer = mediaSource!.addSourceBuffer(mimeType);
        sourceBuffer.addEventListener("updateend", processQueue);
        processQueue();
      } catch {
        warn("add source buffer failed; fallback to accumulated playback");
        usingMediaSource = false;
      }
    });
  }
}

function appendChunk(base64: string) {
  const bytes = base64ToBytes(base64);
  log("audio chunk received", { bytes: bytes.byteLength });

  accumulatedData.push(bytes);

  if (usingMediaSource) {
    pendingBuffers.push(bytes);
    processQueue();
  }
}

function endStream() {
  log("end stream", { chunks: accumulatedData.length, usingMediaSource });
  streamEnded = true;

  if (usingMediaSource) {
    processQueue();
  } else {
    playAccumulated();
  }
}

function playAccumulated() {
  log("play accumulated audio", { chunks: accumulatedData.length });
  if (accumulatedData.length === 0) {
    warn("cannot play accumulated audio: no chunks");
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
    .catch((err) => {
      warn("accumulated playback failed", err);
      onAudioError();
    });
}

function playCachedAudio(audioBase64: string, mimeType: string) {
  log("play cached audio", { mimeType, base64Length: audioBase64.length });
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
    .catch((err) => {
      warn("cached playback failed", err);
      onAudioError();
    });
}

chrome.runtime.onMessage.addListener((message: OffscreenMessage) => {
  log("message received", { type: message.type });
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
