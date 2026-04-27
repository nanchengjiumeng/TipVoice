import type { AudioStateMessage, PlaybackState } from "../shared/types.ts";
import { sendTTSRequest, sendTTSCancel } from "../shared/messages.ts";
import { FloatingButton } from "./floating-button.ts";

const floatingButton = new FloatingButton();
let currentState: PlaybackState = "idle";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function setState(state: PlaybackState) {
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

// Listen for audio state changes forwarded from background
chrome.runtime.onMessage.addListener((message: AudioStateMessage) => {
  if (message.type !== "AUDIO_STATE") return;

  if (message.state === "playing") {
    setState("playing");
  } else if (message.state === "ended") {
    setState("idle");
  } else if (message.state === "error") {
    setState("error");
  }
});

async function handleButtonClick() {
  // If playing or loading, stop/cancel
  if (currentState === "playing" || currentState === "loading") {
    void sendTTSCancel();
    setState("idle");
    return;
  }

  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text) return;

  setState("loading");

  const response = await sendTTSRequest(text);

  if (!response || !response.success) {
    console.warn("[Tip Voice]", response?.error ?? "No response from background");
    setState("error");
    return;
  }

  // Audio playback is handled by the offscreen document.
  // We'll receive AUDIO_STATE messages via the listener above.
  // If we were cancelled while waiting, don't transition state.
  if ((currentState as PlaybackState) !== "loading") return;

  // Stay in loading state until offscreen reports "playing"
}

floatingButton.onClick(handleButtonClick);

document.addEventListener("mouseup", (e) => {
  // Ignore clicks on our own button
  if (floatingButton.getHost().contains(e.target as Node)) return;

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text) {
      if (currentState === "idle") {
        floatingButton.hide();
      }
      return;
    }

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position above-right of selection
    const x = rect.right + 4;
    const y = rect.top - 36;

    floatingButton.show(x, y);
    if (currentState !== "playing" && currentState !== "loading") {
      setState("idle");
    }
  }, 100);
});

// Hide button when selection is cleared programmatically
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text && currentState === "idle") {
    floatingButton.hide();
  }
});
