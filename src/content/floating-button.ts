import type { PlaybackState } from "../shared/types.ts";
import styles from "./styles.css?inline";

const ICON_SPEAKER = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
</svg>`;

const ICON_STOP = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="12" height="12" rx="1"/>
</svg>`;

const ICON_LOADING = `<svg class="icon-loading" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"/>
</svg>`;

const ICON_ERROR = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
</svg>`;

const STATE_ICONS: Record<PlaybackState, string> = {
  idle: ICON_SPEAKER,
  loading: ICON_LOADING,
  playing: ICON_STOP,
  error: ICON_ERROR,
};

export class FloatingButton {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private button: HTMLButtonElement;
  private clickCallback: (() => void) | null = null;

  constructor() {
    this.host = document.createElement("div");
    this.host.id = "tts-reader-host";
    this.shadow = this.host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);

    this.button = document.createElement("button");
    this.button.className = "tts-btn";
    this.button.dataset.state = "idle";
    this.button.innerHTML = ICON_SPEAKER;
    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.clickCallback?.();
    });
    this.shadow.appendChild(this.button);
  }

  show(x: number, y: number): void {
    if (!this.host.parentElement) {
      document.body.appendChild(this.host);
    }

    // Clamp to viewport bounds
    const btnSize = 32;
    const margin = 4;
    const clampedX = Math.min(x, window.innerWidth - btnSize - margin);
    const clampedY = Math.max(y, margin);

    this.host.style.left = `${clampedX}px`;
    this.host.style.top = `${clampedY}px`;
  }

  hide(): void {
    this.host.remove();
    this.setState("idle");
  }

  setState(state: PlaybackState): void {
    this.button.dataset.state = state;
    this.button.innerHTML = STATE_ICONS[state];
  }

  onClick(callback: () => void): void {
    this.clickCallback = callback;
  }

  isVisible(): boolean {
    return !!this.host.parentElement;
  }

  getHost(): HTMLDivElement {
    return this.host;
  }

  destroy(): void {
    this.host.remove();
    this.clickCallback = null;
  }
}
