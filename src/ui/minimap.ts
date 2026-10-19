import type { MapLayout, WarpDef } from "../data/schema";
import { decodeWalk } from "../data/schema";

/** A corner map: the walk grid drawn once, dots for everything each frame. */
export class Minimap {
  private base: HTMLCanvasElement | null = null;
  private g: CanvasRenderingContext2D;
  private scale = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext("2d")!;
  }

  setMap(l: MapLayout) {
    const c = document.createElement("canvas");
    c.width = l.width;
    c.height = l.height;
    const g = c.getContext("2d")!;
    const walk = decodeWalk(l.walk_rle, l.width * l.height);
    const img = g.createImageData(l.width, l.height);
    for (let i = 0; i < walk.length; i++) {
      const [r, gg, b] = walk[i] ? [96, 118, 92] : [30, 40, 34];
      img.data.set([r, gg, b, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = "rgba(225,200,140,0.45)";
    for (const [x, y, w, h] of l.safe_areas) if (w < l.width) g.fillRect(x, y, w, h);
    this.base = c;
    this.scale = Math.min(this.canvas.width / l.width, this.canvas.height / l.height);
  }

  draw(self: { x: number; y: number } | null, mobs: { x: number; y: number; chasing: boolean }[], others: { x: number; y: number }[], npcs: { x: number; y: number }[], warps: WarpDef[]) {
    const g = this.g;
    const s = this.scale;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.base) return;
    g.imageSmoothingEnabled = false;
    g.drawImage(this.base, 0, 0, this.base.width * s, this.base.height * s);
    g.fillStyle = "#7ff0ff";
    for (const w of warps) g.fillRect(w.trigger_rect[0] * s, w.trigger_rect[1] * s, Math.max(3, w.trigger_rect[2] * s), Math.max(3, w.trigger_rect[3] * s));
    for (const m of mobs) { g.fillStyle = m.chasing ? "#ff6a5a" : "#d9a44a"; g.fillRect(m.x * s - 1, m.y * s - 1, 2, 2); }
    g.fillStyle = "#ffe08a";
    for (const n of npcs) g.fillRect(n.x * s - 1.5, n.y * s - 1.5, 3, 3);
    g.fillStyle = "#9fd8ff";
    for (const o of others) g.fillRect(o.x * s - 1.5, o.y * s - 1.5, 3, 3);
    if (self) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(self.x * s, self.y * s, 3, 0, 7); g.fill(); }
  }
}
