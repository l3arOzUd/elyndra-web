import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, open: true },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { main: "index.html", modelViewer: "model-viewer.html", animationViewer: "animation-viewer.html", spriteViewer: "sprite-viewer.html", characterViewer: "character-viewer.html" } },
  },
});
