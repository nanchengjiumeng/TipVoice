import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [react(), webExtension({ additionalInputs: ["offscreen.html", "storage.html"] })],
  build: {
    emptyOutDir: true,
  },
  test: {
    setupFiles: ["tests/setup.ts"],
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
});
