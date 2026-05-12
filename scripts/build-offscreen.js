import { build } from "vite";

await build({
  configFile: false,
  root: process.cwd(),
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rollupOptions: {
      input: "offscreen.html",
    },
  },
});
