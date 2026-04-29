import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    webExtension({ additionalInputs: ["offscreen.html", "manager.html"] }),
  ],
  build: {
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [],
    },
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
