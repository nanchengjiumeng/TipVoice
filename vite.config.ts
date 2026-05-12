import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest })],
  build: {
    emptyOutDir: true,
    outDir: "dist",
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
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
