import { createRoot } from "react-dom/client";
import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeMarkdown } from "../shared/markdown.ts";
import styles from "./styles.css?inline";

const ICON_TRANSLATE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
</svg>`;

const ICON_CLOSE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
</svg>`;

const ICON_PIN = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 3l5 5-4 1-4 4v5l-1 1-4.5-4.5L3 19l-1-1 4-4H1l-1-1 4-4 1-4 5 5 6-6z"/>
</svg>`;

export interface TranslationResult {
  profileId: string;
  profileName: string;
  result: string;
  error?: string;
  pending?: boolean;
}

function playAudioViaOffscreen(url: string): void {
  /*
   * Route audio playback through offscreen document.
   * Offscreen document is NOT subject to host page CSP restrictions.
   * Flow: content script → background → offscreen (plays Audio directly).
   */
  chrome.runtime.sendMessage({ type: "AUDIO_PLAY_URL", url }).catch(() => {
    /* Extension context lost (page not refreshed after extension reload) - silently ignore */
  });
}

function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;
    const nativeClick = () => {
      /* Ripple effect */
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "audio-ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${(rect.width - size) / 2}px`;
      ripple.style.top = `${(rect.height - size) / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());

      playAudioViaOffscreen(src);
    };
    btn.addEventListener("click", nativeClick);
    return () => btn.removeEventListener("click", nativeClick);
  }, [src]);
  return (
    <button ref={ref} className="audio-play-btn" title="播放发音" type="button">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  );
}

function MarkdownText({ value }: { value: string }) {
  return (
    <div className="translation-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audio: (props: any) => {
            const src: string | undefined = props?.src;
            if (!src) return null;
            return <AudioPlayer src={src} />;
          },
        }}
      >
        {normalizeMarkdown(value)}
      </ReactMarkdown>
    </div>
  );
}

export class TranslationUI {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private panel: HTMLDivElement;
  private contentDiv: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
  private pinBtn: HTMLButtonElement;
  private markdownRoots = new Map<string, ReturnType<typeof createRoot>>();
  private isPinned = false;
  private dragState: {
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
  } | null = null;
  private resizeState: {
    pointerId: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null = null;

  constructor() {
    this.host = document.createElement("div");
    this.host.id = "tts-translation-host";
    this.host.style.position = "fixed";
    this.host.style.zIndex = "10000";
    this.shadow = this.host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);

    this.panel = document.createElement("div");
    this.panel.className = "translation-panel";
    this.panel.innerHTML = `
      <div class="translation-header">
        <span class="translation-title">翻译结果</span>
        <div class="translation-actions"></div>
      </div>
      <div class="translation-content"></div>
      <div class="translation-resize-handle" title="调整大小"></div>
    `;

    this.contentDiv = this.panel.querySelector(".translation-content") as HTMLDivElement;

    const headerDiv = this.panel.querySelector(".translation-header") as HTMLDivElement;
    const actionsDiv = this.panel.querySelector(".translation-actions") as HTMLDivElement;
    this.pinBtn = document.createElement("button");
    this.pinBtn.className = "translation-icon-btn";
    this.pinBtn.title = "固定窗口";
    this.pinBtn.innerHTML = ICON_PIN;
    this.pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.setPinned(!this.isPinned);
    });
    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "translation-icon-btn";
    this.closeBtn.title = "关闭";
    this.closeBtn.innerHTML = ICON_CLOSE;
    this.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.hide();
    });
    actionsDiv.append(this.pinBtn, this.closeBtn);

    headerDiv.addEventListener("pointerdown", (e) => this.startDrag(e));
    const resizeHandle = this.panel.querySelector(".translation-resize-handle") as HTMLDivElement;
    resizeHandle.addEventListener("pointerdown", (e) => this.startResize(e));

    this.shadow.appendChild(this.panel);
  }

  show(x: number, y: number): void {
    if (!this.host.parentElement) {
      document.body.appendChild(this.host);
    }
    if (this.isPinned) return;

    const panelWidth = this.panel.offsetWidth || 475;
    const panelHeight = this.panel.offsetHeight || 200;
    const margin = 8;

    let clampedX = x;
    let clampedY = y;

    if (x + panelWidth > window.innerWidth - margin) {
      clampedX = window.innerWidth - panelWidth - margin;
    }
    if (clampedX < margin) {
      clampedX = margin;
    }

    if (y + panelHeight > window.innerHeight - margin) {
      clampedY = y - panelHeight - margin;
    }
    if (clampedY < margin) {
      clampedY = margin;
    }

    this.host.style.left = `${clampedX}px`;
    this.host.style.top = `${clampedY}px`;
  }

  hide(): void {
    this.setPinned(false);
    this.host.remove();
    this.clearResults();
  }

  isFixed(): boolean {
    return this.isPinned;
  }

  clearResults(): void {
    for (const root of this.markdownRoots.values()) {
      root.unmount();
    }
    this.markdownRoots.clear();
    this.contentDiv.innerHTML = "";
  }

  addResult(result: TranslationResult): void {
    const item = document.createElement("div");
    item.dataset.profileId = result.profileId;
    item.className = `translation-item ${result.error ? "error" : "success"}`;

    this.renderResultItem(item, result);

    this.contentDiv.appendChild(item);

    if (!this.host.parentElement) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        this.show(rect.left, rect.bottom + 8);
      }
    }
  }

  setLoading(profiles: Array<{ id: string; name: string }>): void {
    this.clearResults();
    for (const profile of profiles) {
      const item = document.createElement("div");
      item.className = "translation-item loading";
      item.dataset.profileId = profile.id;
      item.innerHTML = `
        <div class="translation-item-header">
          <span class="translation-profile-name">${profile.name}</span>
          <span class="translation-status loading">翻译中...</span>
        </div>
        <div class="translation-text loading">
          <div class="loading-spinner"></div>
        </div>
      `;
      this.contentDiv.appendChild(item);
    }
  }

  updateResult(profileId: string, result: TranslationResult): void {
    const item = this.contentDiv.querySelector<HTMLDivElement>(`[data-profile-id="${profileId}"]`);
    if (item) {
      item.className = `translation-item ${
        result.error ? "error" : result.pending ? "loading" : "success"
      }`;
      this.renderResultItem(item, result);
      item.scrollIntoView({ block: "nearest" });
    }
  }

  private renderResultItem(item: HTMLDivElement, result: TranslationResult): void {
    this.markdownRoots.get(result.profileId)?.unmount();
    this.markdownRoots.delete(result.profileId);
    item.textContent = "";

    const header = document.createElement("div");
    header.className = "translation-item-header";

    const profileName = document.createElement("span");
    profileName.className = "translation-profile-name";
    profileName.textContent = result.profileName;

    const status = document.createElement("span");
    status.className = `translation-status ${
      result.error ? "error" : result.pending ? "loading" : "success"
    }`;
    status.textContent = result.error ? "失败" : result.pending ? "翻译中..." : "完成";

    header.append(profileName, status);
    item.appendChild(header);

    const text = document.createElement("div");
    text.className = `translation-text${result.error ? " error" : ""}`;
    item.appendChild(text);

    if (result.error) {
      text.textContent = result.error;
      return;
    }

    const root = createRoot(text);
    root.render(<MarkdownText value={result.result} />);
    this.markdownRoots.set(result.profileId, root);
  }

  isVisible(): boolean {
    return !!this.host.parentElement;
  }

  getHost(): HTMLDivElement {
    return this.host;
  }

  destroy(): void {
    this.clearResults();
    this.host.remove();
  }

  private setPinned(pinned: boolean): void {
    this.isPinned = pinned;
    this.panel.classList.toggle("pinned", pinned);
    this.pinBtn.classList.toggle("active", pinned);
    this.pinBtn.title = pinned ? "取消固定" : "固定窗口";
  }

  private startDrag(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest(".translation-actions")) return;
    e.preventDefault();
    const rect = this.host.getBoundingClientRect();
    this.dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    this.panel.setPointerCapture(e.pointerId);
    this.panel.classList.add("dragging");
    this.panel.addEventListener("pointermove", this.handleDrag);
    this.panel.addEventListener("pointerup", this.stopDrag);
    this.panel.addEventListener("pointercancel", this.stopDrag);
  }

  private handleDrag = (e: PointerEvent): void => {
    if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;
    const maxLeft = window.innerWidth - this.panel.offsetWidth - 8;
    const maxTop = window.innerHeight - this.panel.offsetHeight - 8;
    const left = Math.min(
      Math.max(8, this.dragState.left + e.clientX - this.dragState.startX),
      maxLeft,
    );
    const top = Math.min(
      Math.max(8, this.dragState.top + e.clientY - this.dragState.startY),
      maxTop,
    );
    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
  };

  private stopDrag = (e: PointerEvent): void => {
    if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;
    this.panel.releasePointerCapture(e.pointerId);
    this.panel.classList.remove("dragging");
    this.panel.removeEventListener("pointermove", this.handleDrag);
    this.panel.removeEventListener("pointerup", this.stopDrag);
    this.panel.removeEventListener("pointercancel", this.stopDrag);
    this.dragState = null;
  };

  private startResize(e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.resizeState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: this.panel.offsetWidth,
      height: this.panel.offsetHeight,
    };
    this.panel.setPointerCapture(e.pointerId);
    this.panel.classList.add("resizing");
    this.panel.addEventListener("pointermove", this.handleResize);
    this.panel.addEventListener("pointerup", this.stopResize);
    this.panel.addEventListener("pointercancel", this.stopResize);
  }

  private handleResize = (e: PointerEvent): void => {
    if (!this.resizeState || e.pointerId !== this.resizeState.pointerId) return;
    const rect = this.host.getBoundingClientRect();
    const width = Math.min(
      Math.max(320, this.resizeState.width + e.clientX - this.resizeState.startX),
      window.innerWidth - rect.left - 8,
    );
    const height = Math.min(
      Math.max(180, this.resizeState.height + e.clientY - this.resizeState.startY),
      window.innerHeight - rect.top - 8,
    );
    this.panel.style.width = `${width}px`;
    this.panel.style.height = `${height}px`;
  };

  private stopResize = (e: PointerEvent): void => {
    if (!this.resizeState || e.pointerId !== this.resizeState.pointerId) return;
    this.panel.releasePointerCapture(e.pointerId);
    this.panel.classList.remove("resizing");
    this.panel.removeEventListener("pointermove", this.handleResize);
    this.panel.removeEventListener("pointerup", this.stopResize);
    this.panel.removeEventListener("pointercancel", this.stopResize);
    this.resizeState = null;
  };
}

export class TranslateButton {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private button: HTMLButtonElement;
  private clickCallback: (() => void) | null = null;

  constructor() {
    this.host = document.createElement("div");
    this.host.id = "tts-translate-btn-host";
    this.host.style.position = "fixed";
    this.host.style.zIndex = "9999";
    this.shadow = this.host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);

    this.button = document.createElement("button");
    this.button.className = "tts-translate-btn";
    this.button.innerHTML = ICON_TRANSLATE;
    this.button.title = "翻译";
    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.clickCallback?.();
    });
    this.button.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    this.button.addEventListener("mouseup", (e) => {
      e.stopPropagation();
    });
    this.shadow.appendChild(this.button);
  }

  show(x: number, y: number): void {
    if (!this.host.parentElement) {
      document.body.appendChild(this.host);
    }

    const btnSize = 32;
    const margin = 4;
    const clampedX = Math.min(x, window.innerWidth - btnSize - margin);
    const clampedY = Math.max(y, margin);

    this.host.style.left = `${clampedX}px`;
    this.host.style.top = `${clampedY}px`;
    this.host.style.position = "fixed";
    this.host.style.zIndex = "9999";
  }

  hide(): void {
    this.host.remove();
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
