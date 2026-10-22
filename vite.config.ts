import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, open: true },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { main: "index.html", brineWalk: "art-source/monsters/mob_0022/walk-review.html", brineHit: "art-source/monsters/mob_0022/hit-review.html", brineAttack: "art-source/monsters/mob_0022/attack-review.html", brineDeath: "art-source/monsters/mob_0022/death-review.html", uiPreview: "ui-preview.html", modelViewer: "model-viewer.html", animationViewer: "animation-viewer.html", spriteViewer: "sprite-viewer.html", spriteGallery: "sprite-gallery.html", characterViewer: "character-viewer.html", fxViewer: "fx-viewer.html", mapViewer: "map-viewer.html" } },
  },
});
