import { describe, expect, it } from "vite-plus/test";
import {
  createTTSRequest,
  createTTSCancel,
  isTTSRequest,
  isTTSCancel,
} from "../src/shared/messages.ts";

describe("messages", () => {
  it("creates a TTS request message", () => {
    const msg = createTTSRequest("hello world");
    expect(msg).toEqual({ type: "TTS_REQUEST", text: "hello world" });
  });

  it("creates a TTS cancel message", () => {
    const msg = createTTSCancel();
    expect(msg).toEqual({ type: "TTS_CANCEL" });
  });

  it("identifies TTS request messages", () => {
    expect(isTTSRequest({ type: "TTS_REQUEST", text: "test" })).toBe(true);
    expect(isTTSRequest({ type: "TTS_CANCEL" })).toBe(false);
  });

  it("identifies TTS cancel messages", () => {
    expect(isTTSCancel({ type: "TTS_CANCEL" })).toBe(true);
    expect(isTTSCancel({ type: "TTS_REQUEST", text: "test" })).toBe(false);
  });
});
